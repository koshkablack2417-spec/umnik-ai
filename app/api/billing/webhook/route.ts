import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Billing webhook is not configured." }, { status: 503 });
  }
  const stripe = new Stripe(secret);
  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, request.headers.get("stripe-signature") ?? "", webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (event.type === "checkout.session.completed" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    let subscription: Stripe.Subscription | null = null;
    let userId: string | null = null;
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      userId = session.metadata?.supabase_user_id ?? session.client_reference_id;
      if (typeof session.subscription === "string") subscription = await stripe.subscriptions.retrieve(session.subscription);
    } else {
      subscription = event.data.object as Stripe.Subscription;
      userId = subscription.metadata.supabase_user_id ?? null;
    }
    if (userId && subscription) {
      const active = subscription.status === "active" || subscription.status === "trialing";
      const { error } = await admin.from("billing_subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        plan: subscription.metadata.plan ?? "unknown",
        current_period_end: new Date(subscription.items.data[0]?.current_period_end ? subscription.items.data[0].current_period_end * 1000 : Date.now()).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "stripe_subscription_id" });
      if (error) return NextResponse.json({ error: "Could not update subscription record." }, { status: 500 });
      if (!active && event.type === "customer.subscription.deleted") {
        // The status is retained for billing history; access checks should only allow active/trialing.
      }
    }
  }
  return NextResponse.json({ received: true });
}
