import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ProviderId = "gemini" | "openai" | "claude" | "grok" | "qwen";
type ChatMessage = { role: "user" | "assistant"; content: string };

const providerConfig: Record<Exclude<ProviderId, "gemini" | "claude">, {
  env: string;
  endpoint: string;
  model: string;
}> = {
  openai: { env: "OPENAI_API_KEY", endpoint: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" },
  grok: { env: "XAI_API_KEY", endpoint: "https://api.x.ai/v1/chat/completions", model: "grok-3-mini" },
  qwen: { env: "QWEN_API_KEY", endpoint: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", model: "qwen-plus" },
};

const systemPrompt = (language: string) =>
  `Ты — Умник AI, полезный, внимательный и честный ИИ-помощник. Отвечай прежде всего на последнее сообщение пользователя и учитывай предыдущую переписку только как контекст. Отвечай на языке пользователя; язык интерфейса: ${language}. По умолчанию пиши ясно, естественно и по делу; для сложных задач используй короткие разделы и пошаговые инструкции. Если просят код, предоставляй цельный, согласованный пример и указывай важные предпосылки. Не выдумывай факты, источники, ссылки, цитаты, результаты проверок или выполненные действия. Если не знаешь ответа или не хватает данных, честно скажи об этом и задай один конкретный уточняющий вопрос, когда он необходим. Для вычислений проверяй шаги и единицы. Не утверждай, что можешь просматривать интернет, видеть аккаунты, запускать код или менять внешние сервисы, если соответствующий инструмент реально не предоставлен. Не проси пользователя публиковать пароли, API-ключи, токены или другие секреты.`;

function extractOpenAICompatibleText(data: unknown): string {
  const obj = data as { choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }> };
  const content = obj.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part.text ?? "").join("");
  return "";
}

async function openAICompatible(endpoint: string, apiKey: string, model: string, history: ChatMessage[], system: string) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...history],
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("AI provider error:", response.status, detail.slice(0, 500));
    if (response.status === 401 || response.status === 403) throw new Error("Ключ выбранной нейросети недействителен или не имеет доступа.");
    if (response.status === 429) throw new Error("У нейросети временно закончился лимит запросов. Попробуй позже.");
    throw new Error("Провайдер нейросети временно не смог ответить.");
  }
  const text = extractOpenAICompatibleText(await response.json());
  if (!text) throw new Error("Нейросеть вернула пустой ответ. Попробуй ещё раз.");
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

    const provider = (typeof body.provider === "string" ? body.provider : "gemini") as ProviderId;
    const language = typeof body.language === "string" ? body.language.slice(0, 12) : "ru";

    if (!message) return NextResponse.json({ error: "Напиши сообщение, чтобы начать." }, { status: 400 });
    if (message.length > 12000) return NextResponse.json({ error: "Сообщение слишком длинное (максимум 12 000 символов)." }, { status: 413 });
    if (!["gemini", "openai", "claude", "grok", "qwen"].includes(provider)) {
      return NextResponse.json({ error: "Неизвестный AI-провайдер." }, { status: 400 });
    }

    // The chat UI may include the current message in history as well as in message.
    // Avoid sending it twice, while still supporting clients that send history only.
    const lastHistoryMessage = history[history.length - 1];
    const conversation: ChatMessage[] = lastHistoryMessage?.role === "user" && lastHistoryMessage.content === message
      ? history
      : [...history, { role: "user", content: message }];
    const system = systemPrompt(language);
    let text = "";

    if (provider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return NextResponse.json({ error: "Gemini не настроен: добавь GEMINI_API_KEY в переменные окружения сайта." }, { status: 503 });
      const ai = new GoogleGenAI({ apiKey });
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: conversation.map((item) => ({ role: item.role === "assistant" ? "model" : "user", parts: [{ text: item.content }] })),
        config: { systemInstruction: system },
      });
      text = result.text ?? "";
    } else if (provider === "claude") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return NextResponse.json({ error: "Claude не настроен: добавь ANTHROPIC_API_KEY в переменные окружения сайта." }, { status: 503 });
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-3-5-haiku-latest", max_tokens: 2048, system, messages: conversation }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.error("Anthropic API error:", response.status, detail.slice(0, 500));
        if (response.status === 401 || response.status === 403) throw new Error("Ключ Claude недействителен или не имеет доступа.");
        if (response.status === 429) throw new Error("У Claude временно закончился лимит запросов. Попробуй позже.");
        throw new Error("Claude временно не смог ответить.");
      }
      const data = await response.json() as { content?: Array<{ type?: string; text?: string }> };
      text = (data.content ?? []).filter((part) => part.type === "text").map((part) => part.text ?? "").join("");
    } else {
      const config = providerConfig[provider];
      const apiKey = process.env[config.env];
      if (!apiKey) return NextResponse.json({ error: `${provider === "openai" ? "ChatGPT" : provider === "grok" ? "Grok" : "Qwen"} не настроен: добавь ${config.env} в переменные окружения сайта.` }, { status: 503 });
      text = await openAICompatible(config.endpoint, apiKey, config.model, conversation, system);
    }

    return NextResponse.json({ text: text || "Не удалось получить текстовый ответ." });
  } catch (error) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "";
    const known = ["Ключ ", "У нейросети", "У Claude", "Провайдер ", "Нейросеть вернула", "Claude временно"];
    if (known.some((prefix) => message.startsWith(prefix))) return NextResponse.json({ error: message }, { status: 502 });
    if (message.includes("timed out") || message.includes("aborted")) return NextResponse.json({ error: "Нейросеть отвечает слишком долго. Попробуй ещё раз." }, { status: 504 });
    return NextResponse.json({ error: "Не удалось получить ответ от AI. Проверь настройки API и попробуй ещё раз." }, { status: 500 });
  }
}
