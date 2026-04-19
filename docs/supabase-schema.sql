-- Supabase schema for Interactive Saju
-- Run in Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  birth_date date,
  birth_calendar text not null default 'solar' check (birth_calendar in ('solar', 'lunar')),
  birth_time time,
  birth_time_unknown boolean not null default true,
  gender text not null default 'other' check (gender in ('female', 'male', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.app_user_state enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "state_select_own" on public.app_user_state;
drop policy if exists "state_insert_own" on public.app_user_state;
drop policy if exists "state_update_own" on public.app_user_state;

create policy "state_select_own"
  on public.app_user_state
  for select
  using (auth.uid() = user_id);

create policy "state_insert_own"
  on public.app_user_state
  for insert
  with check (auth.uid() = user_id);

create policy "state_update_own"
  on public.app_user_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists app_user_state_touch_updated_at on public.app_user_state;
create trigger app_user_state_touch_updated_at
before update on public.app_user_state
for each row execute function public.touch_updated_at();
