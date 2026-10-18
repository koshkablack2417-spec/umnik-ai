"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import "./artifacts.css";

type ArtifactKind = "html" | "code" | "markdown";
const starter = {
  html: '<!doctype html>\n<html lang="ru">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>Мой проект</title>\n  <style>body{font-family:system-ui;margin:0;padding:3rem;background:#f5f7ff;color:#20243a}main{max-width:760px;margin:auto}button{padding:.8rem 1rem;border:0;border-radius:12px;background:#5b6df5;color:white;cursor:pointer}</style>\n</head>\n<body><main><h1>Привет, мир! ✨</h1><p>Это твой интерактивный артефакт. Измени код и нажми «Предпросмотр».</p><button onclick="document.querySelector(\'#message\').textContent=\'Работает! 🎉\'">Нажми меня</button><p id="message"></p></main></body>\n</html>',
  code: 'function greet(name: string) {\n  return `Привет, ${name}! ✨`;\n}\n\nconsole.log(greet("мир"));',
  markdown: '# Мой артефакт ✨\n\nЭто рабочее пространство для идей, заметок и документов.\n\n## План\n- [ ] Описать идею\n- [ ] Добавить детали\n- [ ] Поделиться результатом\n\n> Совет: нажми «Скачать», чтобы сохранить файл.'
};

export default function ArtifactsPage() {
  const [kind, setKind] = useState<ArtifactKind>("html");
  const [code, setCode] = useState(starter.html);
  const [title, setTitle] = useState("Мой первый артефакт");
  const [preview, setPreview] = useState(true);
  const [notice, setNotice] = useState("");
  const html = useMemo(() => {
    if (kind === "html") return code;
    if (kind === "markdown") {
      const escaped = code.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      const rendered = escaped.split("\n").map((line) => {
        if (line.startsWith("# ")) return "<h1>"+line.slice(2)+"</h1>";
        if (line.startsWith("## ")) return "<h2>"+line.slice(3)+"</h2>";
        if (line.startsWith("- [ ] ")) return "<p>☐ "+line.slice(6)+"</p>";
        if (line.startsWith("- ")) return "<p>• "+line.slice(2)+"</p>";
        if (line.startsWith("> ")) return "<blockquote>"+line.slice(2)+"</blockquote>";
        return line ? "<p>"+line+"</p>" : "";
      }).join("\n");
      return "<!doctype html><html><meta charset='utf-8'><meta name='viewport' content='width=device-width'><body style='font:16px/1.7 system-ui;max-width:760px;margin:40px auto;padding:0 20px;color:#24283b'>"+rendered+"</body></html>";
    }
    return "<!doctype html><html><meta charset='utf-8'><body style='font:14px/1.6 system-ui;padding:20px'><p>Предпросмотр кода отключён для безопасности. Скачай файл и запусти его в подходящей среде.</p><pre style='white-space:pre-wrap'>"+code.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")+"</pre></body></html>";
  }, [code, kind]);
  function changeKind(next: ArtifactKind) { setKind(next); setCode(starter[next]); setNotice(""); }
  function download() {
    const ext = kind === "html" ? "html" : kind === "markdown" ? "md" : "ts";
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = (title.trim() || "artifact").replace(/[^a-zA-Zа-яА-Я0-9_-]+/g, "-")+"."+ext;
    anchor.click(); URL.revokeObjectURL(url); setNotice("Файл подготовлен для скачивания.");
  }
  async function copyCode() {
    try { await navigator.clipboard.writeText(code); setNotice("Код скопирован."); }
    catch { setNotice("Не удалось скопировать автоматически — выдели текст в редакторе."); }
  }
  return <main className="artifactShell">
    <header className="artifactTop"><Link href="/" className="artifactBack">← Умник AI</Link><div className="artifactBrand"><span>✦</span> Артефакты</div><span className="artifactTag">РЕДАКТОР И ПРЕДПРОСМОТР</span></header>
    <section className="artifactIntro"><p className="artifactEyebrow">UMNIK AI WORKSPACE</p><h1>Преврати идею в <span>артефакт</span></h1><p>Создавай мини-приложения, страницы, документы и фрагменты кода в одном рабочем пространстве.</p></section>
    <section className="artifactWorkspace">
      <aside className="artifactRail"><strong>Новый артефакт</strong><p>Выбери формат, редактируй содержимое и смотри результат.</p>
        <button className={kind==="html"?"active":""} onClick={()=>changeKind("html")}><span>▣</span><span><b>Веб-страница</b><small>HTML + CSS + JS</small></span></button>
        <button className={kind==="code"?"active":""} onClick={()=>changeKind("code")}><span>⌘</span><span><b>Код</b><small>TypeScript</small></span></button>
        <button className={kind==="markdown"?"active":""} onClick={()=>changeKind("markdown")}><span>▤</span><span><b>Документ</b><small>Markdown</small></span></button>
        <div className="artifactSafety">Предпросмотр HTML запускается в изолированном iframe. Не вставляй секреты, токены или пароли в публичные артефакты.</div>
      </aside>
      <div className="artifactMain">
        <div className="artifactToolbar"><input aria-label="Название артефакта" value={title} onChange={e=>setTitle(e.target.value)} /><div><button onClick={()=>setPreview(!preview)}>{preview?"Скрыть предпросмотр":"Предпросмотр"}</button><button onClick={()=>void copyCode()}>Копировать</button><button className="artifactPrimary" onClick={download}>↓ Скачать</button></div></div>
        <div className={preview?"artifactSplit":"artifactSplit editorOnly"}>
          <section className="artifactEditor"><div className="artifactPaneTitle"><span>Редактор</span><span>{kind==="html"?"HTML":kind==="code"?"TYPESCRIPT":"MARKDOWN"}</span></div><textarea spellCheck={false} aria-label="Содержимое артефакта" value={code} onChange={e=>setCode(e.target.value)} /></section>
          {preview && <section className="artifactPreview"><div className="artifactPaneTitle"><span>Предпросмотр</span><span className="livePill">● Локально</span></div><iframe title="Предпросмотр артефакта" sandbox="allow-scripts" srcDoc={html} /></section>}
        </div>
        {notice && <p className="artifactNotice" role="status">{notice}</p>}
      </div>
    </section>
    <footer className="artifactFooter">Артефакты сохраняются в текущем редакторе до перезагрузки страницы. Скачай файл, чтобы не потерять работу.</footer>
  </main>;
}
