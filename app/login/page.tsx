"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Stage = "input" | "code";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Вход пока не настроен: владелец сайта должен добавить NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setStage("code");
      setMessage("Проверь почту. Введи одноразовый код из письма; иногда письмо попадает в «Спам».");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить код.");
    } finally { setBusy(false); }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setError("Авторизация не настроена."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: "email",
      });
      if (error) throw error;
      window.location.assign("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Код не подошёл. Попробуй ещё раз.");
    } finally { setBusy(false); }
  }

  async function oauth(provider: "google" | "apple") {
    setError(""); setMessage("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Авторизация пока не настроена владельцем сайта.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setBusy(false); }
  }

  return (
    <main className="authPage">
      <section className="authCard">
        <Link href="/" className="authBack">← На главную</Link>
        <img src="/brain-cap.svg" alt="Умник AI" className="authLogo" />
        <div className="authEyebrow">ТВОЙ УМНЫЙ ПОМОЩНИК</div>
        <h1>{stage === "input" ? "Войти в Умник AI" : "Проверь свою почту"}</h1>
        <p className="authDescription">Аккаунт сохраняет твои настройки и историю чатов между посещениями.</p>
        <div className="oauthButtons">
          <button type="button" className="oauthButton" onClick={() => void oauth("apple")} disabled={busy}>　Продолжить с Apple</button>
          <button type="button" className="oauthButton" onClick={() => void oauth("google")} disabled={busy}><span className="googleG">G</span>　Продолжить с Google</button>
        </div>
        <div className="authDivider"><span>вход по электронной почте</span></div>
        {stage === "input" ? (
          <form className="authForm" onSubmit={sendCode}>
            <label htmlFor="email">Электронная почта</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            <button className="authPrimary" disabled={busy}>{busy ? "Отправляем…" : "Прислать код на почту"}</button>
          </form>
        ) : (
          <form className="authForm" onSubmit={verifyCode}>
            <label htmlFor="token">Код подтверждения</label>
            <input id="token" inputMode="numeric" autoComplete="one-time-code" required maxLength={10} value={token} onChange={e => setToken(e.target.value)} placeholder="Введи код подтверждения" />
            <button className="authPrimary" disabled={busy}>{busy ? "Проверяем…" : "Подтвердить код и войти"}</button>
            <button type="button" className="authTextButton" onClick={() => { setStage("input"); setToken(""); setMessage(""); }} disabled={busy}>Изменить адрес почты</button>
          </form>
        )}
        {message && <p className="authSuccess" role="status">{message}</p>}
        {error && <p className="authError" role="alert">{error}</p>}
        <p className="authFinePrint">Используя вход, ты соглашаешься не делиться кодами подтверждения с другими. Доступность Apple и Google зависит от настройки провайдеров сайта.</p>
      </section>
    </main>
  );
}
