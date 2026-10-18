"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import "./studio.css";

type Kind = "image" | "video";
type Result = { id: string; kind: Kind; prompt: string; url: string; createdAt: number; aspectRatio: string };
const HISTORY_KEY = "umnik-generation-history";
const labels = {
  ru: { back:"← Назад в Умник AI", title:"Творческая студия", subtitle:"Превращай идеи в изображения и видео с помощью AI.", image:"Изображение", video:"Видео", prompt:"Опиши, что хочешь создать", imageHint:"Например: уютная космическая библиотека, мягкий свет, детальная цифровая иллюстрация", videoHint:"Например: камера плавно летит над фантастическим городом на закате, кинематографично", landscape:"Альбомная", portrait:"Портретная", square:"Квадрат", createImage:"✦ Создать изображение", createVideo:"▶ Создать видео", generating:"Генерация…", gallery:"Мои работы", empty:"Здесь появятся созданные результаты. Запусти первую генерацию!", save:"Сохранить в галерею", saved:"Сохранено", download:"Скачать файл", open:"Открыть оригинал", remove:"Удалить", waiting:"Задача выполняется у провайдера. Можно подождать здесь.", needPrompt:"Сначала опиши свою идею.", failed:"Не удалось выполнить генерацию.", note:"Генерация может занимать некоторое время и расходовать средства на твоём API-аккаунте.", setup:"Для генерации нужен ключ FAL_KEY в настройках окружения проекта.", all:"Все", onlyImages:"Изображения", onlyVideos:"Видео" },
  en: { back:"← Back to Umnik AI", title:"Creative studio", subtitle:"Turn ideas into images and videos with AI.", image:"Image", video:"Video", prompt:"Describe what you want to create", imageHint:"For example: a cozy cosmic library, soft lighting, detailed digital illustration", videoHint:"For example: camera glides over a fantasy city at sunset, cinematic", landscape:"Landscape", portrait:"Portrait", square:"Square", createImage:"✦ Generate image", createVideo:"▶ Generate video", generating:"Generating…", gallery:"My creations", empty:"Your results will appear here. Create your first one!", save:"Save to gallery", saved:"Saved", download:"Download file", open:"Open original", remove:"Delete", waiting:"The provider is processing your task. You can wait here.", needPrompt:"Describe your idea first.", failed:"Generation failed.", note:"Generation can take time and may incur charges on your API account.", setup:"Add FAL_KEY to your project's environment settings to enable generation.", all:"All", onlyImages:"Images", onlyVideos:"Videos" }
};

export default function StudioPage() {
  const [kind, setKind] = useState<Kind>("image");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("landscape");
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [activeResult, setActiveResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<Result[]>([]);
  const [filter, setFilter] = useState<"all" | Kind>("all");
  const [language, setLanguage] = useState<"ru" | "en">("ru");
  const t = labels[language];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved));
      const lang = localStorage.getItem("umnik-language");
      if (lang && lang !== "ru") setLanguage("en");
    } catch {}
  }, []);

  function persist(next: Result[]) {
    setHistory(next);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {
      setError("Локальное хранилище заполнено. Удали старые работы или скачай их.");
    }
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) { setError(t.needPrompt); return; }
    if (busy) return;
    setBusy(true); setError(""); setActiveResult(null); setStatusText(t.generating);
    try {
      const start = await fetch(`/api/generate/${kind}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: cleanPrompt, aspectRatio }),
      });
      const job = await start.json();
      if (!start.ok) throw new Error(job.error || t.failed);
      const deadline = Date.now() + (kind === "video" ? 9 * 60_000 : 3 * 60_000);
      let resultUrl = "";
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        const poll = await fetch(`/api/generate/${kind}?id=${encodeURIComponent(job.requestId)}`, { cache: "no-store" });
        const data = await poll.json();
        if (!poll.ok) throw new Error(data.error || t.failed);
        if (data.status === "COMPLETED" && data.url) { resultUrl = data.url; break; }
        if (data.status === "FAILED") throw new Error(data.error || t.failed);
        setStatusText(data.status === "IN_QUEUE" ? "В очереди…" : t.waiting);
      }
      if (!resultUrl) throw new Error("Задача ещё выполняется. Попробуй создать её снова чуть позже — провайдер может обрабатывать длинные видео.");
      const result: Result = { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, kind, prompt: cleanPrompt, url: resultUrl, createdAt: Date.now(), aspectRatio };
      setActiveResult(result);
      persist([result, ...history.filter((item) => item.url !== result.url)].slice(0, 30));
      setStatusText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failed);
      setStatusText("");
    } finally { setBusy(false); }
  }

  function removeResult(id: string) { persist(history.filter((item) => item.id !== id)); if (activeResult?.id === id) setActiveResult(null); }
  const visibleHistory = history.filter((item) => filter === "all" || item.kind === filter);

  return <main className="studioShell">
    <header className="studioTop"><Link href="/" className="studioBack">{t.back}</Link><div className="studioBrand"><span>✦</span> Умник AI</div><select aria-label="Language" className="studioLang" value={language} onChange={(e) => setLanguage(e.target.value as "ru" | "en")}><option value="ru">Русский</option><option value="en">English</option></select></header>
    <div className="studioContent">
      <div className="studioIntro"><div className="studioEyebrow">AI CREATIVE LAB</div><h1>{t.title}</h1><p>{t.subtitle}</p></div>
      <div className="studioGrid">
        <section className="studioPanel">
          <div className="kindTabs"><button className={kind === "image" ? "selected" : ""} onClick={() => setKind("image")}>▧ {t.image}</button><button className={kind === "video" ? "selected" : ""} onClick={() => setKind("video")}>▷ {t.video}</button></div>
          <form onSubmit={generate}>
            <label className="studioLabel" htmlFor="studio-prompt">{t.prompt}</label>
            <textarea id="studio-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={2000} placeholder={kind === "image" ? t.imageHint : t.videoHint} rows={5} />
            <div className="promptMeta">{prompt.length}/2000</div>
            <label className="studioLabel" htmlFor="studio-ratio">Формат</label>
            <div className="ratioTabs"><button type="button" className={aspectRatio === "landscape" ? "selected" : ""} onClick={() => setAspectRatio("landscape")}>▱ {t.landscape}</button><button type="button" className={aspectRatio === "portrait" ? "selected" : ""} onClick={() => setAspectRatio("portrait")}>▯ {t.portrait}</button><button type="button" className={aspectRatio === "square" ? "selected" : ""} onClick={() => setAspectRatio("square")}>□ {t.square}</button></div>
            <button className="generateButton" disabled={busy || !prompt.trim()} type="submit">{busy ? <><span className="spinner"/> {t.generating}</> : kind === "image" ? t.createImage : t.createVideo}</button>
          </form>
          {busy && <div className="studioProgress"><span className="spinner"/><span>{statusText || t.waiting}</span></div>}
          {error && <div className="studioError" role="alert">{error}</div>}
          <p className="studioNote">ⓘ {t.note}</p>
          <p className="studioSetup">{t.setup}</p>
        </section>
        <section className="previewPanel">
          <div className="previewHeader"><h2>Предпросмотр</h2>{activeResult && <span className="readyTag">Готово</span>}</div>
          {activeResult ? <div className="resultPreview">
            {activeResult.kind === "image" ? <img src={activeResult.url} alt={activeResult.prompt} /> : <video src={activeResult.url} controls playsInline />}
            <p className="resultPrompt">{activeResult.prompt}</p>
            <div className="resultActions"><a href={activeResult.url} target="_blank" rel="noreferrer">{t.open}</a><a href={activeResult.url} download>{t.download}</a><span className="savedLabel">✓ {t.saved}</span></div>
          </div> : <div className="previewEmpty"><div className="previewGlyph">{busy ? <span className="spinner"/> : "✧"}</div><strong>{busy ? t.generating : "Твоя следующая идея"}</strong><p>{busy ? (statusText || t.waiting) : "Результат появится здесь после генерации."}</p></div>}
        </section>
      </div>
      <section className="gallerySection"><div className="galleryHeading"><div><h2>{t.gallery}</h2><p>{history.length} / 30</p></div><div className="galleryFilters"><button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>{t.all}</button><button className={filter === "image" ? "selected" : ""} onClick={() => setFilter("image")}>{t.onlyImages}</button><button className={filter === "video" ? "selected" : ""} onClick={() => setFilter("video")}>{t.onlyVideos}</button></div></div>
        {visibleHistory.length === 0 ? <div className="galleryEmpty">{t.empty}</div> : <div className="galleryGrid">{visibleHistory.map((item) => <article className="galleryCard" key={item.id}><button className="galleryMedia" onClick={() => setActiveResult(item)} aria-label="Открыть результат">{item.kind === "image" ? <img src={item.url} alt={item.prompt}/> : <video src={item.url} muted preload="metadata"/>}<span>{item.kind === "image" ? "▧" : "▷"}</span></button><div className="galleryCardBody"><p>{item.prompt}</p><div className="galleryCardFoot"><small>{new Date(item.createdAt).toLocaleDateString()}</small><a href={item.url} target="_blank" rel="noreferrer">{t.open}</a><button onClick={() => removeResult(item.id)} aria-label={t.remove}>{t.remove}</button></div></div></article>)}</div>}
      </section>
    </div>
  </main>;
}
