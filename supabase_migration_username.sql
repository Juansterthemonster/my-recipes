-- ─────────────────────────────────────────────────────────────────────────────
-- Mi Sazón – Username profiles migration
-- Run this once in your Supabase SQL editor (Database → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create profiles table
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  username    text unique not null
                check (char_length(username) between 3 and 20)
                check (username ~ '^[a-zA-Z0-9_-]+$'),
  created_at  timestamp with time zone default now()
);

-- 2. Enable Row Level Security
alter table public.profiles enable row level security;

-- 3. Anyone (including anonymous) can READ profiles
--    Needed so the signup form can check username availability before the
--    user has an authenticated session.
create policy "Profiles are publicly readable"
  on public.profiles
  for select
  using (true);

-- 4. Authenticated users can INSERT their own profile row
create policy "Users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- 5. Authenticated users can UPDATE their own profile row
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id);
