"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Stage = "input" | "code";
type Lang = "ru" | "en" | "es";
const words: Record<Lang, Record<string, string>> = {
  ru: { back:"← На главную", eyebrow:"ТВОЙ УМНЫЙ ПОМОЩНИК", signIn:"Войти в Умник AI", check:"Проверь свою почту", desc:"Аккаунт сохраняет настройки и историю чатов между посещениями.", apple:"　Продолжить с Apple", google:"Продолжить с Google", emailDivider:"или войти по электронной почте", terms:"Я прочитал(а) и принимаю", termsLink:"Пользовательское соглашение", email:"Электронная почта", send:"Прислать код на почту", sending:"Отправляем…", token:"Код подтверждения", tokenPlaceholder:"Введи код из письма", verify:"Подтвердить код и войти", verifying:"Проверяем…", change:"Изменить адрес почты", fine:"Не делись кодами подтверждения. Доступность Apple и Google зависит от настроек сайта.", acceptError:"Чтобы продолжить, прими пользовательское соглашение.", missing:"Вход пока не настроен: владелец сайта должен добавить NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.", sent:"Проверь почту. Введи одноразовый код из письма; иногда письмо попадает в «Спам».", sendError:"Не удалось отправить код.", verifyError:"Код не подошёл. Попробуй ещё раз." },
  en: { back:"← Home", eyebrow:"YOUR SMART AI ASSISTANT", signIn:"Sign in to Umnik AI", check:"Check your email", desc:"Your account keeps your settings and chat history between visits.", apple:"　Continue with Apple", google:"Continue with Google", emailDivider:"or continue with email", terms:"I have read and accept the", termsLink:"Terms of Service", email:"Email address", send:"Send me a sign-in code", sending:"Sending…", token:"Verification code", tokenPlaceholder:"Enter the code from your email", verify:"Verify code and sign in", verifying:"Verifying…", change:"Change email address", fine:"Never share verification codes. Apple and Google sign-in depend on site configuration.", acceptError:"Please accept the Terms of Service to continue.", missing:"Sign-in is not configured yet. The site owner must add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.", sent:"Check your inbox for the one-time code. It may arrive in Spam.", sendError:"Could not send the code.", verifyError:"That code did not work. Please try again." },
  es: { back:"← Inicio", eyebrow:"TU ASISTENTE INTELIGENTE", signIn:"Entrar en Umnik AI", check:"Revisa tu correo", desc:"Tu cuenta guarda tus ajustes y el historial de chats.", apple:"　Continuar con Apple", google:"Continuar con Google", emailDivider:"o continuar con correo electrónico", terms:"He leído y acepto las", termsLink:"Condiciones del servicio", email:"Correo electrónico", send:"Enviarme un código", sending:"Enviando…", token:"Código de verificación", tokenPlaceholder:"Introduce el código del correo", verify:"Verificar e iniciar sesión", verifying:"Verificando…", change:"Cambiar correo", fine:"No compartas códigos de verificación. Apple y Google dependen de la configuración del sitio.", acceptError:"Acepta las condiciones para continuar.", missing:"El acceso aún no está configurado. El propietario debe añadir NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.", sent:"Revisa tu bandeja de entrada; el código podría llegar a Spam.", sendError:"No se pudo enviar el código.", verifyError:"El código no es válido. Inténtalo de nuevo." }
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [token, setToken] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<Lang>("ru");
  const [brand, setBrand] = useState("Умник AI");
  const t = words[language];

  useEffect(() => {
    try {
      const saved = localStorage.getItem("umnik-language") || "ru";
      setLanguage(saved === "ru" || saved === "es" ? saved : "en");
      const names: Record<string,string> = { ru:"Умник AI", en:"Umnik AI", es:"Umnik AI", fr:"Umnik AI", sv:"Umnik AI", ja:"ウムニク AI", zh:"乌姆尼克 AI", de:"Umnik AI", it:"Umnik AI", pt:"Umnik AI", ar:"أومنيك AI", ko:"움니크 AI", hi:"उमनिक AI", nl:"Umnik AI", pl:"Umnik AI", tr:"Umnik AI", uk:"Умник AI", fi:"Umnik AI", no:"Umnik AI", da:"Umnik AI" };
      setBrand(names[saved] || "Umnik AI");
      const theme = localStorage.getItem("umnik-theme") || "light";
      document.documentElement.dataset.theme = theme;
    } catch {}
  }, []);

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (!acceptedTerms) { setError(t.acceptError); return; }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setError(t.missing); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      if (error) throw error;
      setStage("code"); setMessage(t.sent);
    } catch (e) { setError(e instanceof Error ? e.message : t.sendError); }
    finally { setBusy(false); }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setError(t.missing); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: "email" });
      if (error) throw error;
      window.location.assign("/");
    } catch (e) { setError(e instanceof Error ? e.message : t.verifyError); }
    finally { setBusy(false); }
  }

  async function oauth(provider: "google" | "apple") {
    setError(""); setMessage("");
    if (!acceptedTerms) { setError(t.acceptError); return; }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setError(t.missing); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback` } });
    if (error) { setError(error.message); setBusy(false); }
  }

  return (
    <main className="authPage iosAuth">
      <section className="authCard iosAuthCard">
        <Link href="/" className="authBack">{t.back}</Link>
        <img src="/brain-cap.svg" alt={brand} className="authLogo" />
        <div className="authEyebrow">{t.eyebrow}</div>
        <h1>{stage === "input" ? t.signIn.replace("Umnik AI", brand) : t.check}</h1>
        <p className="authDescription">{t.desc}</p>
        <div className="oauthButtons">
          <button type="button" className="oauthButton" onClick={() => void oauth("apple")} disabled={busy}>{t.apple}</button>
          <button type="button" className="oauthButton" onClick={() => void oauth("google")} disabled={busy}><span className="googleG">G</span>　{t.google}</button>
        </div>
        <div className="authDivider"><span>{t.emailDivider}</span></div>
        {stage === "input" && <label className="authFinePrint iosTerms"><input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} /><span>{t.terms} <Link href="/terms" target="_blank" rel="noreferrer">{t.termsLink}</Link>.</span></label>}
        {stage === "input" ? (
          <form className="authForm" onSubmit={sendCode}>
            <label htmlFor="email">{t.email}</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            <button className="authPrimary" disabled={busy}>{busy ? t.sending : t.send}</button>
          </form>
        ) : (
          <form className="authForm" onSubmit={verifyCode}>
            <label htmlFor="token">{t.token}</label>
            <input id="token" inputMode="numeric" autoComplete="one-time-code" required maxLength={10} value={token} onChange={e => setToken(e.target.value)} placeholder={t.tokenPlaceholder} />
            <button className="authPrimary" disabled={busy}>{busy ? t.verifying : t.verify}</button>
            <button type="button" className="authTextButton" onClick={() => { setStage("input"); setToken(""); setMessage(""); }} disabled={busy}>{t.change}</button>
          </form>
        )}
        {message && <p className="authSuccess" role="status">{message}</p>}
        {error && <p className="authError" role="alert">{error}</p>}
        <p className="authFinePrint">{t.fine}</p>
      </section>
    </main>
  );
}
