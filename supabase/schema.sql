-- Bedtime Stories — Supabase schema (accounts, credits, admin CRM)
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).
-- Safe to re-run: everything is created with IF NOT EXISTS / OR REPLACE.

-- ─── Config ─────────────────────────────────────────────────────────────────
-- The Google account below is auto-flagged as admin the moment it first signs
-- in. To add more admins later, run:
--   update public.profiles set is_admin = true where email = 'someone@else.com';
-- (edit the email literal in handle_new_user() below before running this file
-- if you want a different bootstrap admin)

-- ─── Tables ─────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  name          text,
  picture       text,
  credits       integer not null default 3,
  tier          text not null default 'free'
                  check (tier in ('free','starter','popular','power','unlimited')),
  is_admin      boolean not null default false,
  tags          text[] not null default '{}',
  notes         text not null default '',
  created_at    timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  amount     integer not null,
  type       text not null check (type in
               ('signup_bonus','purchase','story_deduct','voice_deduct','refund','admin_adjust')),
  note       text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.stories (
  id            text primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  title         text,
  body          text,
  settings      jsonb,
  delivery_mode text,
  created_at    timestamptz not null default now()
);

create table if not exists public.purchases (
  id                 bigint generated always as identity primary key,
  user_id            uuid not null references public.profiles(id) on delete cascade,
  razorpay_order_id  text,
  razorpay_payment_id text,
  amount_inr         numeric,
  credits            integer,
  status             text not null default 'created'
                       check (status in ('created','verified','failed')),
  created_at         timestamptz not null default now()
);

create index if not exists credit_transactions_user_id_idx on public.credit_transactions(user_id);
create index if not exists stories_user_id_idx             on public.stories(user_id);
create index if not exists purchases_user_id_idx           on public.purchases(user_id);

-- ─── is_admin() helper (SECURITY DEFINER avoids RLS recursion) ──────────────

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ─── New-user trigger: create profile + signup bonus ────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, picture, is_admin)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    (new.email = 'claudeonly0607@gmail.com')
  )
  on conflict (id) do nothing;

  insert into public.credit_transactions (user_id, amount, type, note)
  values (new.id, 3, 'signup_bonus', 'Welcome bonus')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep last_login_at fresh on every sign-in
create or replace function public.handle_user_login()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set last_login_at = now() where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_login on auth.users;
create trigger on_auth_user_login
  after update of last_sign_in_at on auth.users
  for each row execute function public.handle_user_login();

-- ─── Credit RPCs ─────────────────────────────────────────────────────────────

create or replace function public.spend_credits(p_amount integer, p_type text default 'story_deduct')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_type not in ('story_deduct','voice_deduct') then
    raise exception 'invalid type';
  end if;

  update public.profiles
     set credits = credits - p_amount
   where id = auth.uid() and credits >= p_amount
  returning credits into v_balance;

  if v_balance is null then
    raise exception 'insufficient_credits';
  end if;

  insert into public.credit_transactions (user_id, amount, type)
  values (auth.uid(), -p_amount, p_type);

  return v_balance;
end;
$$;

create or replace function public.refund_credits(p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  update public.profiles
     set credits = credits + p_amount
   where id = auth.uid()
  returning credits into v_balance;

  insert into public.credit_transactions (user_id, amount, type)
  values (auth.uid(), p_amount, 'refund');

  return v_balance;
end;
$$;

-- Called only from the server (service-role key) after Razorpay verification.
create or replace function public.redeem_purchase(
  p_user_id uuid, p_credits integer, p_order_id text, p_payment_id text, p_amount numeric
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  insert into public.purchases (user_id, razorpay_order_id, razorpay_payment_id, amount_inr, credits, status)
  values (p_user_id, p_order_id, p_payment_id, p_amount, p_credits, 'verified');

  update public.profiles set credits = credits + p_credits
   where id = p_user_id
  returning credits into v_balance;

  insert into public.credit_transactions (user_id, amount, type, note)
  values (p_user_id, p_credits, 'purchase', p_order_id);

  return v_balance;
end;
$$;

-- ─── Admin RPCs ──────────────────────────────────────────────────────────────

create or replace function public.admin_adjust_credits(p_user_id uuid, p_amount integer, p_note text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  update public.profiles set credits = greatest(0, credits + p_amount)
   where id = p_user_id
  returning credits into v_balance;

  insert into public.credit_transactions (user_id, amount, type, note, created_by)
  values (p_user_id, p_amount, 'admin_adjust', p_note, auth.uid());

  return v_balance;
end;
$$;

create or replace function public.admin_set_tier(p_user_id uuid, p_tier text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  update public.profiles set tier = p_tier where id = p_user_id;
end;
$$;

create or replace function public.admin_update_notes_tags(p_user_id uuid, p_notes text, p_tags text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  update public.profiles set notes = coalesce(p_notes, notes), tags = coalesce(p_tags, tags)
   where id = p_user_id;
end;
$$;

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table public.profiles           enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.stories            enable row level security;
alter table public.purchases          enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());
-- No insert/update/delete policies for profiles: all mutations go through the
-- SECURITY DEFINER RPCs above, which bypass RLS as their own definer.

drop policy if exists credit_transactions_select on public.credit_transactions;
create policy credit_transactions_select on public.credit_transactions
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists purchases_select on public.purchases;
create policy purchases_select on public.purchases
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists stories_select on public.stories;
create policy stories_select on public.stories
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists stories_insert on public.stories;
create policy stories_insert on public.stories
  for insert with check (user_id = auth.uid());

drop policy if exists stories_delete on public.stories;
create policy stories_delete on public.stories
  for delete using (user_id = auth.uid() or public.is_admin());
