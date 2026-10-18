import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

async function reserveGeneration(kind: Kind) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) return { ok: false as const, status: 503, error: "Лимиты генерации не настроены администратором." };
  const cookieStore = await cookies();
  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items: { name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }[]) => { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
    },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return { ok: false as const, status: 401, error: "Войди в аккаунт, чтобы использовать генерацию." };
  const ownerEmails = (process.env.UMNIK_OWNER_EMAILS || "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  const isOwner = !!user.email && ownerEmails.includes(user.email.toLowerCase());
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.rpc("reserve_generation_quota", { p_user_id: user.id, p_kind: kind, p_is_owner: isOwner });
  if (error) {
    console.error("Generation quota reservation failed", error.message);
    return { ok: false as const, status: 503, error: "Не удалось проверить лимит. Администратор должен применить supabase/schema.sql." };
  }
  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.allowed) return { ok: false as const, status: 429, error: kind === "image" ? "Месячный лимит изображений (20) исчерпан." : "Месячный лимит видео (10) исчерпан." };
  return { ok: true as const, remaining: result.remaining };
}


export const runtime = "nodejs";
export const maxDuration = 60;

type Kind = "image" | "video";
function getModel(kind: Kind) {
  return kind === "image"
    ? (process.env.FAL_IMAGE_MODEL || "fal-ai/flux/schnell")
    : (process.env.FAL_VIDEO_MODEL || "fal-ai/wan/v2.2-a14b/text-to-video");
}
function getKey() { return process.env.FAL_KEY; }

export async function POST(request: Request, context: { params: Promise<{ kind: string }> }) {
  const { kind: rawKind } = await context.params;
  if (rawKind !== "image" && rawKind !== "video") return NextResponse.json({ error: "Неизвестный тип генерации." }, { status: 404 });
  const kind = rawKind as Kind;
  const key = getKey();
  if (!key) return NextResponse.json({ error: "Генерация не настроена: добавь FAL_KEY в переменные окружения проекта." }, { status: 503 });

  try {
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) return NextResponse.json({ error: "Опиши, что нужно создать." }, { status: 400 });
    if (prompt.length > 2000) return NextResponse.json({ error: "Описание должно быть не длиннее 2 000 символов." }, { status: 413 });

    const quota = await reserveGeneration(kind);
    if (!quota.ok) return NextResponse.json({ error: quota.error }, { status: quota.status });

    const model = getModel(kind);
    const input = kind === "image"
      ? { prompt, image_size: body.aspectRatio === "portrait" ? "portrait_4_3" : body.aspectRatio === "square" ? "square_hd" : "landscape_4_3", num_images: 1 }
      : { prompt, aspect_ratio: body.aspectRatio === "portrait" ? "9:16" : body.aspectRatio === "square" ? "1:1" : "16:9" };

    const response = await fetch(`https://queue.fal.run/${model}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(20000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("fal queue error", response.status, data);
      return NextResponse.json({ error: typeof data.detail === "string" ? data.detail : "Провайдер не смог запустить задачу. Проверь ключ и выбранную модель." }, { status: response.status === 401 ? 503 : 502 });
    }
    if (typeof data.request_id !== "string") return NextResponse.json({ error: "Провайдер не вернул идентификатор задачи." }, { status: 502 });
    return NextResponse.json({ requestId: data.request_id, status: "IN_QUEUE" });
  } catch (error) {
    console.error("Generation start error", error);
    return NextResponse.json({ error: "Не удалось запустить генерацию. Попробуй ещё раз." }, { status: 500 });
  }
}

export async function GET(request: Request, context: { params: Promise<{ kind: string }> }) {
  const { kind: rawKind } = await context.params;
  if (rawKind !== "image" && rawKind !== "video") return NextResponse.json({ error: "Неизвестный тип генерации." }, { status: 404 });
  const kind = rawKind as Kind;
  const key = getKey();
  if (!key) return NextResponse.json({ error: "Не настроен FAL_KEY." }, { status: 503 });
  const requestId = new URL(request.url).searchParams.get("id") || "";
  if (!/^[a-zA-Z0-9_-]{6,160}$/.test(requestId)) return NextResponse.json({ error: "Некорректный идентификатор задачи." }, { status: 400 });

  try {
    const model = getModel(kind);
    const base = `https://queue.fal.run/${model}/requests/${requestId}`;
    const statusResponse = await fetch(`${base}/status`, { headers: { Authorization: `Key ${key}` }, cache: "no-store", signal: AbortSignal.timeout(15000) });
    const statusData = await statusResponse.json().catch(() => ({}));
    if (!statusResponse.ok) return NextResponse.json({ error: "Не удалось проверить статус задачи." }, { status: 502 });
    if (statusData.status === "FAILED") return NextResponse.json({ status: "FAILED", error: "Генерация не удалась. Попробуй изменить описание и запустить снова." });
    if (statusData.status !== "COMPLETED") return NextResponse.json({ status: statusData.status || "IN_PROGRESS" });

    const resultResponse = await fetch(base, { headers: { Authorization: `Key ${key}` }, cache: "no-store", signal: AbortSignal.timeout(20000) });
    const result = await resultResponse.json().catch(() => ({}));
    if (!resultResponse.ok) return NextResponse.json({ error: "Не удалось получить готовый результат." }, { status: 502 });
    const url = kind === "image" ? result.images?.[0]?.url : (result.video?.url || result.video_url || result.output?.video?.url);
    if (typeof url !== "string" || !url.startsWith("https://")) return NextResponse.json({ error: "Модель завершила задачу, но не вернула ссылку на результат. Проверь настройки модели FAL." }, { status: 502 });
    return NextResponse.json({ status: "COMPLETED", url, contentType: kind === "image" ? "image" : "video" });
  } catch (error) {
    console.error("Generation status error", error);
    return NextResponse.json({ error: "Не удалось проверить результат. Попробуй обновить страницу." }, { status: 500 });
  }
}
