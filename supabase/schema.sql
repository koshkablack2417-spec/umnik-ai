-- Run this file in Supabase SQL Editor before enabling cloud chat history.
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  text text not null check (char_length(text) <= 20000),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_user_created_idx
  on public.chat_messages (user_id, created_at);

alter table public.chat_messages enable row level security;

create policy "Users can read their own chat messages"
  on public.chat_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert their own chat messages"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own chat messages"
  on public.chat_messages for delete
  using (auth.uid() = user_id);


-- Stripe subscription records. Never expose this table to browser clients.
create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  status text not null,
  plan text not null,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.billing_subscriptions enable row level security;
-- No client-facing policies: only the trusted webhook service role may write/read these records.


-- Stripe webhook idempotency ledger. Insert only after an event has been processed successfully.
create table if not exists public.billing_webhook_events (
  event_id text primary key,
  event_type text not null,
  event_created_at timestamptz not null,
  processed_at timestamptz not null default now()
);
alter table public.billing_webhook_events enable row level security;
-- No client-facing policies: service role only.

-- Additional payment state for access/billing decisions.
alter table public.billing_subscriptions
  add column if not exists payment_status text not null default 'unknown'
    check (payment_status in ('unknown', 'paid', 'failed', 'refunded'));
alter table public.billing_subscriptions
  add column if not exists last_invoice_id text;
