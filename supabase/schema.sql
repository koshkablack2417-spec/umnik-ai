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

drop policy if exists "Users can read their own chat messages" on public.chat_messages;
create policy "Users can read their own chat messages"
  on public.chat_messages for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own chat messages" on public.chat_messages;
create policy "Users can insert their own chat messages"
  on public.chat_messages for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own chat messages" on public.chat_messages;
create policy "Users can delete their own chat messages"
  on public.chat_messages for delete to authenticated
  using ((select auth.uid()) = user_id);


-- Per-user preferences and independent chat sessions.
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'light' check (theme in ('auto', 'light', 'dark')),
  language text not null default 'ru' check (char_length(language) <= 12),
  provider text not null default 'openai' check (provider in ('openai', 'claude', 'grok', 'qwen')),
  active_chat_id uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);
-- Keep persisted model preferences aligned with the providers exposed by the app.
alter table public.user_settings alter column provider set default 'openai';
update public.user_settings set provider = 'openai' where provider = 'gemini';
alter table public.user_settings drop constraint if exists user_settings_provider_check;
alter table public.user_settings
  add constraint user_settings_provider_check check (provider in ('openai', 'claude', 'grok', 'qwen'));
alter table public.user_settings enable row level security;
drop policy if exists "Users can read their own settings" on public.user_settings;
create policy "Users can read their own settings"
  on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can insert their own settings" on public.user_settings;
create policy "Users can insert their own settings"
  on public.user_settings for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update their own settings" on public.user_settings;
create policy "Users can update their own settings"
  on public.user_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Existing rows receive their own chat id during migration; new messages are grouped by chat.
alter table public.chat_messages
  add column if not exists chat_id uuid not null default gen_random_uuid();
create index if not exists chat_messages_user_chat_created_idx
  on public.chat_messages (user_id, chat_id, created_at desc);

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
create index if not exists billing_subscriptions_user_id_idx
  on public.billing_subscriptions (user_id);
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


-- Keep the existing RLS auto-enable event trigger, but prevent direct API execution.
do $revoke$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$revoke$;

-- Monthly media quotas: 20 images and 10 videos per user.
create table if not exists public.generation_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  images_used integer not null default 0 check (images_used >= 0),
  videos_used integer not null default 0 check (videos_used >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, month_start)
);
alter table public.generation_usage enable row level security;
-- No client policies: only the trusted server-side service role can access quota rows.

create or replace function public.reserve_generation_quota(
  p_user_id uuid,
  p_kind text,
  p_is_owner boolean default false
)
returns table(allowed boolean, remaining integer)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_month date := date_trunc('month', now())::date;
  v_used integer;
  v_limit integer;
begin
  if p_kind not in ('image', 'video') then
    raise exception 'Unsupported generation kind';
  end if;

  insert into public.generation_usage(user_id, month_start)
  values (p_user_id, v_month)
  on conflict (user_id, month_start) do nothing;

  select case when p_kind = 'image' then images_used else videos_used end
    into v_used
    from public.generation_usage
   where user_id = p_user_id and month_start = v_month
   for update;

  v_limit := case when p_kind = 'image' then 20 else 10 end;
  if p_is_owner then
    return query select true, -1;
    return;
  end if;

  if v_used >= v_limit then
    return query select false, 0;
    return;
  end if;

  if p_kind = 'image' then
    update public.generation_usage
       set images_used = images_used + 1, updated_at = now()
     where user_id = p_user_id and month_start = v_month;
  else
    update public.generation_usage
       set videos_used = videos_used + 1, updated_at = now()
     where user_id = p_user_id and month_start = v_month;
  end if;

  return query select true, v_limit - v_used - 1;
end;
$$;

revoke all on function public.reserve_generation_quota(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.reserve_generation_quota(uuid, text, boolean) to service_role;
