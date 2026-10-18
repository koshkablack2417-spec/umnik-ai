import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const provider = body.provider ?? "gemini";
    const language = typeof body.language === "string" ? body.language : "ru";

    if (!message) {
      return NextResponse.json({ error: "Напиши сообщение, чтобы начать." }, { status: 400 });
    }
    if (message.length > 12000) {
      return NextResponse.json({ error: "Сообщение слишком длинное (максимум 12 000 символов)." }, { status: 413 });
    }
    if (provider !== "gemini") {
      return NextResponse.json({ error: "Этот AI-провайдер пока не подключён. Сейчас доступен Gemini." }, { status: 501 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Не настроен GEMINI_API_KEY. Добавь ключ в .env.local." }, { status: 503 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: { systemInstruction: `Ты — Умник AI, внимательный, дружелюбный и честный помощник. Приоритет — точность и полезность, а не уверенный тон. Отвечай на языке пользователя; язык интерфейса: ${language}. Не выдумывай факты, источники, ссылки, цитаты или выполненные действия. Если не уверен или данных недостаточно, прямо обозначь неопределённость и задай уточняющий вопрос, когда это важно. Для вычислений проверяй шаги и единицы измерения; для сложных тем объясняй ясно и структурированно. Учитывай весь предоставленный контекст, отвечай конкретно и не утверждай, что у тебя есть доступ к актуальным данным или инструментам, которых нет.` },
    });
    return NextResponse.json({ text: result.text ?? "Не удалось получить текстовый ответ." });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Не удалось получить ответ от AI. Проверь настройки API и попробуй ещё раз." }, { status: 500 });
  }
}
