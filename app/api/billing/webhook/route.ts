import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type BillingStatus = {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: string;
  plan: string;
  payment_status: "unknown" | "paid" | "failed" | "refunded";
  last_invoice_id: string | null;
  current_period_end: string | null;
  updated_at: string;
};

function customerId(subscription: Stripe.Subscription): string {
  return typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;
}

function periodEnd(subscription: Stripe.Subscription): string | null {
  // Stripe API versions expose billing periods on subscription items.
  const ends = subscription.items.data
    .map((item) => (item as unknown as { current_period_end?: number }).current_period_end)
    .filter((value): value is number => typeof value === "number");
  const latest = ends.length ? Math.max(...ends) : null;
  return latest === null ? null : new Date(latest * 1000).toISOString();
}

async function persistSubscription(
  admin: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription,
  paymentStatus: BillingStatus["payment_status"] = "unknown",
  invoiceId: string | null = null,
) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) throw new Error("Subscription is missing supabase_user_id metadata.");

  const record: Partial<BillingStatus> & Pick<BillingStatus, "user_id" | "stripe_customer_id" | "stripe_subscription_id" | "status" | "plan" | "updated_at"> = {
    user_id: userId,
    stripe_customer_id: customerId(subscription),
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    plan: subscription.metadata?.plan ?? "unknown",
    updated_at: new Date().toISOString(),
  };
  if (paymentStatus !== "unknown") {
    // A late invoice event must never undo a refund recorded for that same invoice.
    const { data } = await admin
      .from("billing_subscriptions")
      .select("payment_status,last_invoice_id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();
    const existing = data as { payment_status: string | null; last_invoice_id: string | null } | null;
    const sameInvoiceWasRefunded =
      Boolean(invoiceId) &&
      existing?.last_invoice_id === invoiceId &&
      existing?.payment_status === "refunded";
    if (!sameInvoiceWasRefunded) record.payment_status = paymentStatus;
  }
  if (invoiceId) record.last_invoice_id = invoiceId;
  const end = periodEnd(subscription);
  if (end) record.current_period_end = end;

  const { error } = await admin.from("billing_subscriptions").upsert(record as never, {
    onConflict: "stripe_subscription_id",
  });
  if (error) throw error;
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacy = (invoice as unknown as { subscription?: string | Stripe.Subscription | null }).subscription;
  if (typeof legacy === "string") return legacy;
  if (legacy && typeof legacy === "object") return legacy.id;

  // Newer Stripe API versions place the subscription under invoice.parent.
  const parent = (invoice as unknown as {
    parent?: { subscription_details?: { subscription?: string | Stripe.Subscription | null } | null } | null;
  }).parent?.subscription_details?.subscription;
  if (typeof parent === "string") return parent;
  if (parent && typeof parent === "object") return parent.id;
  return null;
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Billing webhook is not configured." }, { status: 503 });
  }

  const stripe = new Stripe(secret);
  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      request.headers.get("stripe-signature") ?? "",
      webhookSecret,
    );
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Check previously completed event IDs. The unique key is also enforced by PostgreSQL.
  const { data: previousEvent, error: lookupError } = await admin
    .from("billing_webhook_events")
    .select("event_id")
    .eq("event_id", event.id)
    .maybeSingle();
  if (lookupError) {
    return NextResponse.json({ error: "Could not check webhook idempotency." }, { status: 500 });
  }
  if (previousEvent) return NextResponse.json({ received: true, duplicate: true });

  try {
    let subscription: Stripe.Subscription | null = null;
    let paymentStatus: BillingStatus["payment_status"] = "unknown";
    let invoiceId: string | null = null;

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionRef = session.subscription;
        const subscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
        if (subscriptionId) {
          subscription = await stripe.subscriptions.retrieve(subscriptionId);
          // Older Checkout sessions may only carry user metadata on the session.
          if (!subscription.metadata?.supabase_user_id) {
            const userId = session.metadata?.supabase_user_id ?? session.client_reference_id;
            if (userId) {
              subscription = await stripe.subscriptions.update(subscriptionId, {
                metadata: { ...subscription.metadata, supabase_user_id: userId },
              });
            }
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const snapshot = event.data.object as Stripe.Subscription;
        // Fetch canonical state to avoid stale/out-of-order event snapshots restoring old access.
        subscription = await stripe.subscriptions.retrieve(snapshot.id);
        break;
      }
      case "invoice.payment_succeeded":
      case "invoice.paid":
      case "invoice.payment_failed":
      case "invoice.payment_action_required": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoiceSubscriptionId(invoice);
        if (subscriptionId) {
          subscription = await stripe.subscriptions.retrieve(subscriptionId);
          invoiceId = invoice.id;
          paymentStatus = event.type === "invoice.payment_failed" || event.type === "invoice.payment_action_required"
            ? "failed"
            : "paid";
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const invoiceRef = charge.invoice;
        const invoiceIdFromCharge = typeof invoiceRef === "string" ? invoiceRef : invoiceRef?.id;
        if (invoiceIdFromCharge) {
          const invoice = await stripe.invoices.retrieve(invoiceIdFromCharge);
          const subscriptionId = invoiceSubscriptionId(invoice);
          if (subscriptionId) {
            subscription = await stripe.subscriptions.retrieve(subscriptionId);
            invoiceId = invoice.id;
            paymentStatus = charge.amount_refunded > 0 ? "refunded" : "paid";
          }
        }
        break;
      }
      default:
        // Acknowledge unrelated event types without changing access.
        break;
    }

    if (subscription) {
      await persistSubscription(admin, subscription, paymentStatus, invoiceId);
    }

    // Record only after successful processing so Stripe can retry transient failures.
    const { error: eventInsertError } = await admin.from("billing_webhook_events").insert({
      event_id: event.id,
      event_type: event.type,
      event_created_at: new Date(event.created * 1000).toISOString(),
      processed_at: new Date().toISOString(),
    });
    if (eventInsertError && eventInsertError.code !== "23505") throw eventInsertError;

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", {
      eventId: event.id,
      eventType: event.type,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Webhook processing failed; Stripe may retry." }, { status: 500 });
  }
}
