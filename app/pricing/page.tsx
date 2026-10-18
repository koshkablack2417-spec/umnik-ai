"use client";

import { useState } from "react";
import Link from "next/link";

const plans = [
  { id: "weekly", name: "Неделя", price: "5 €", detail: "Гибкий доступ на 7 дней" },
  { id: "monthly", name: "Месяц", price: "15 €", detail: "Доступ на месяц", featured: true },
  { id: "yearly", name: "Год", price: "50 €", detail: "Доступ на год" },
] as const;

export default function PricingPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function checkout(plan: string) {
    setBusy(plan); setError(""); setNotice("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Оплата пока недоступна.");
      if (typeof data.url !== "string" || !data.url.startsWith("https://")) throw new Error("Ссылка оплаты не получена.");
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось открыть оплату.");
    } finally { setBusy(null); }
  }
  return <main className="pricingPage">
    <Link className="pricingBack" href="/">← Вернуться в Умник AI</Link>
    <img className="pricingLogo" src="/brain-cap.svg" alt="Мегамозг" />
    <p className="pricingEyebrow">УМНИК AI · МЕГАМOЗГ</p>
    <h1>Выбери свой тариф</h1>
    <p className="pricingIntro">Когда бесплатного лимита недостаточно, можно подключить платный доступ.</p>
    <p className="pricingPayments">Оплата через Stripe: основные кредитные и дебетовые карты, Apple Pay и Google Pay, если они доступны для твоего устройства, страны и банка.</p>
    <div className="pricingGrid">
      {plans.map(plan => <article key={plan.id} className={`pricingCard ${"featured" in plan && plan.featured ? "featured" : ""}`}>
        {"featured" in plan && plan.featured && <span className="pricingBadge">Популярный</span>}
        <h2>{plan.name}</h2><p className="pricingPrice">{plan.price}<span> / {plan.id === "weekly" ? "неделю" : plan.id === "monthly" ? "месяц" : "год"}</span></p>
        <p className="pricingDetail">{plan.detail}</p>
        <button className="pricingButton" disabled={busy !== null} onClick={() => void checkout(plan.id)}>{busy === plan.id ? "Подключаем…" : "Выбрать тариф"}</button>
      </article>)}
    </div>
    {error && <p className="pricingError" role="alert">{error} Если аккаунт ещё не подключён, <Link href="/login">сначала войди</Link>.</p>}
    {notice && <p role="status">{notice}</p>}
    <p className="pricingLegal">Платёжные методы показываются Stripe автоматически в зависимости от страны, валюты, браузера и настроек платёжного аккаунта. Ни один сервис не может гарантировать приём абсолютно каждой карты: банк-эмитент может отклонить платёж. Данные карты обрабатывает Stripe, сайт их не хранит. Подписка продлевается автоматически до отмены.</p>
  </main>;
}
