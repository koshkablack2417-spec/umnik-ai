"use client";

import { FormEvent, useState } from "react";
import { providers, type ProviderId } from "@/lib/providers";

type Message = { role: "user" | "assistant"; text: string };
const suggestions = [
  { icon: "✦", title: "Разобраться в сложном", text: "Объясни квантовую физику простыми словами" },
  { icon: "⌘", title: "Создать что-то новое", text: "Придумай идею приложения, которое помогает учиться" },
  { icon: "↗", title: "Помочь с учёбой", text: "Составь план подготовки к контрольной на неделю" },
  { icon: "✎", title: "Написать текст", text: "Помоги написать интересное вступление для проекта" },
];

export default function Home() {
  const [provider, setProvider] = useState<ProviderId>("gemini");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(value = input) {
    const message = value.trim();
    if (!message || loading) return;
    setInput("");
    setError("");
    setMessages((old) => [...old, { role: "user", text: message }]);
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, provider }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Произошла ошибка.");
      setMessages((old) => [...old, { role: "assistant", text: data.text }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось подключиться к AI.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  const selectedProvider = providers.find((item) => item.id === provider);

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brandIcon">✦</span><span>Умник AI</span></div>
        <button className="newChat" onClick={() => { setMessages([]); setError(""); }}>＋　Новый чат</button>
        <div>
          <div className="sideLabel">AI-помощники</div>
          <div className="modelList">
            {providers.map((item) => (
              <button key={item.id} className={`model ${provider === item.id ? "active" : ""}`} onClick={() => setProvider(item.id)} title={item.enabled ? item.description : "Скоро"}>
                <span className="dot" /><span>{item.name}</span>{!item.enabled && <span className="soon">СКОРО</span>}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="sideLabel">Инструменты</div>
          <div className="modelList">
            <button className="model" onClick={() => setError("Генерация изображений появится после подключения отдельного API.")}>▧　Изображения <span className="soon">СКОРО</span></button>
            <button className="model" onClick={() => setError("Генерация видео пока не подключена.")}>▷　Видео <span className="soon">СКОРО</span></button>
            <button className="model" onClick={() => setError("Плагины будут добавлены в следующих версиях.")}>⊞　Плагины <span className="soon">СКОРО</span></button>
          </div>
        </div>
        <div className="sideBottom">Ранняя версия · 0.1.0<br/>Некоторые функции ещё в разработке.</div>
      </aside>

      <section className="main">
        <header className="topbar">
          <div className="mobileBrand"><span className="brandIcon">✦</span>Умник AI</div>
          <div className="topTitle">AI-пространство</div>
          <div className="topRight"><span className="status">Сервис готов</span><span className="avatar">У</span></div>
        </header>

        <div className="content">
          {messages.length === 0 ? (
            <section className="hero">
              <div className="eyebrow">ТВОЙ AI. ТВОИ ИДЕИ.</div>
              <h1>Привет! Что будем<br/><span className="gradient">придумывать?</span></h1>
              <p>Задавай вопросы, учись новому и превращай идеи в реальные проекты — в одном месте.</p>
            </section>
          ) : (
            <section className="chatArea" aria-live="polite">
              {messages.map((message, index) => <div key={index} className={`bubble ${message.role}`}>{message.text}</div>)}
              {loading && <div className="bubble assistant">Думаю над ответом…</div>}
            </section>
          )}

          {messages.length === 0 && <div className="suggestions">
            {suggestions.map((item) => <button key={item.title} className="suggestion" onClick={() => void sendMessage(item.text)}><strong>{item.icon}　{item.title}</strong>{item.text}</button>)}
          </div>}

          <form className="composer" onSubmit={handleSubmit}>
            <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Спроси Умник AI о чём угодно..." aria-label="Сообщение" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} />
            <div className="composerFoot">
              <select className="modelSelect" value={provider} onChange={(event) => setProvider(event.target.value as ProviderId)} aria-label="Выбрать AI">
                {providers.map((item) => <option key={item.id} value={item.id}>{item.name}{item.enabled ? "" : " — скоро"}</option>)}
              </select>
              <span className="composerHint">Enter — отправить · Shift + Enter — новая строка</span>
              <button className="send" type="submit" disabled={loading || !input.trim()}>{loading ? "Думаю…" : "Отправить ↑"}</button>
            </div>
          </form>
          {error && <div className="error" role="alert">{error}</div>}
          <div className="notice">Умник AI может ошибаться. Не отправляй пароли, коды подтверждения и другую личную информацию.</div>
        </div>
      </section>
    </main>
  );
}
