import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const plans = {
  weekly: { price: process.env.STRIPE_PRICE_WEEKLY, label: "Неделя" },
  monthly: { price: process.env.STRIPE_PRICE_MONTHLY, label: "Месяц" },
  yearly: { price: process.env.STRIPE_PRICE_YEARLY, label: "Год" },
} as const;

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!secret || !siteUrl || !supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Оплата ещё не настроена владельцем сайта." }, { status: 503 });
  }
  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items: { name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }[]) => items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Сначала войди в аккаунт." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const planKey = body.plan as keyof typeof plans;
  const plan = plans[planKey];
  if (!plan || !plan.price) return NextResponse.json({ error: "Этот тариф ещё не настроен." }, { status: 400 });
  try {
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: plan.price, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id, plan: planKey },
      subscription_data: { metadata: { supabase_user_id: user.id, plan: planKey } },
      success_url: new URL("/pricing?payment=success", siteUrl).toString(),
      cancel_url: new URL("/pricing?payment=cancelled", siteUrl).toString(),
      allow_promotion_codes: true,
    });
    if (!session.url) throw new Error("Stripe не вернул ссылку оплаты.");
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: "Не удалось создать оплату. Проверь настройки Stripe." }, { status: 502 });
  }
}
