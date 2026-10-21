import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL_ID = "gpt-6-luna";
type ChatMessage = { role: "user" | "assistant"; content: string };

const systemPrompt = (language: string) =>
  "Ты — Умник AI, помощник на базе GPT-6 Luna от OpenAI. Если пользователь спрашивает, какая модель работает в чате, отвечай: «GPT-6 Luna от OpenAI». Не утверждай, что ты ChatGPT как продукт или что работаешь на других AI-провайдерах. " +
  "Отвечай прежде всего на последнее сообщение пользователя и учитывай предыдущую переписку только как контекст. Отвечай на языке пользователя; язык интерфейса: " + language + ". " +
  "По умолчанию пиши ясно, естественно и по делу; для сложных задач используй короткие разделы и пошаговые инструкции. Если просят код, предоставляй цельный, согласованный пример и указывай важные предпосылки. " +
  "Не выдумывай факты, источники, ссылки, цитаты, результаты проверок или выполненные действия. Если не знаешь ответа или не хватает данных, честно скажи об этом и задай один конкретный уточняющий вопрос, когда он необходим. " +
  "Для вычислений проверяй шаги и единицы. Не утверждай, что можешь просматривать интернет, видеть аккаунты, запускать код или менять внешние сервисы, если соответствующий инструмент реально не предоставлен. Не проси пользователя публиковать пароли, API-ключи, токены или другие секреты.";

function extractOpenAIText(data: unknown): string {
  const obj = data as {
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };
  return (obj.output ?? [])
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text")
    .map((part) => part.text ?? "")
    .join("");
}

async function openAI(history: ChatMessage[], language: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL_ID,
      reasoning: { effort: "none" },
      instructions: systemPrompt(language),
      input: history,
      max_output_tokens: 4096,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("OpenAI API error:", response.status, detail.slice(0, 500));
    if (response.status === 401 || response.status === 403) throw new Error("Ключ OPENAI_API_KEY недействителен или у него нет доступа к GPT-6 Luna.");
    if (response.status === 429) throw new Error("У OpenAI временно закончился лимит запросов. Попробуй позже.");
    throw new Error("OpenAI временно не смог ответить.");
  }

  const text = extractOpenAIText(await response.json());
  if (!text) throw new Error("GPT-6 Luna вернула пустой ответ. Попробуй ещё раз.");
  return text;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const rawHistory = Array.isArray(body.history) ? body.history : [];
    const history: ChatMessage[] = rawHistory.slice(-24)
      .filter((item: unknown): item is { role: string; content: string } =>
        !!item && typeof item === "object" && "role" in item && "content" in item &&
        ((item as { role: unknown }).role === "user" || (item as { role: unknown }).role === "assistant") &&
        typeof (item as { content: unknown }).content === "string")
      .map((item: { role: string; content: string }) => ({
        role: item.role as "user" | "assistant",
        content: item.content.slice(0, 12000),
      }));

    const language = typeof body.language === "string" ? body.language.slice(0, 12) : "ru";

    if (!message) return NextResponse.json({ error: "Напиши сообщение, чтобы начать." }, { status: 400 });
    if (message.length > 12000) return NextResponse.json({ error: "Сообщение слишком длинное (максимум 12 000 символов)." }, { status: 413 });
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Чат не настроен: добавь OPENAI_API_KEY в серверные переменные окружения сайта." }, { status: 503 });
    }

    // The chat UI may include the current message in history as well as in message.
    // Avoid sending it twice, while still supporting clients that send history only.
    const lastHistoryMessage = history[history.length - 1];
    const conversation: ChatMessage[] = lastHistoryMessage?.role === "user" && lastHistoryMessage.content === message
      ? history
      : [...history, { role: "user", content: message }];

    const text = await openAI(conversation, language);
    return NextResponse.json({ text });
  } catch (error) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "";
    const known = ["Ключ OPENAI_API_KEY", "У OpenAI", "OpenAI временно", "GPT-6 Luna вернула"];
    if (known.some((prefix) => message.startsWith(prefix))) return NextResponse.json({ error: message }, { status: 502 });
    if (message.includes("OPENAI_API_KEY is missing")) return NextResponse.json({ error: "Чат не настроен: добавь OPENAI_API_KEY в серверные переменные окружения сайта." }, { status: 503 });
    if (message.includes("timed out") || message.includes("aborted")) return NextResponse.json({ error: "Нейросеть отвечает слишком долго. Попробуй ещё раз." }, { status: 504 });
    return NextResponse.json({ error: "Не удалось получить ответ от GPT-6 Luna. Проверь настройки API и попробуй ещё раз." }, { status: 500 });
  }
}
