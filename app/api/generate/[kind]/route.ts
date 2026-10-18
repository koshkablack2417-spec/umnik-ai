import { NextResponse } from "next/server";

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
