-- Migration: "What's new" announcements (v4.43)
-- Run once in the Supabase SQL editor.
--
-- One row per person and announcement: how many times it was shown, when, and whether
-- they tapped "Got it". It lives in the database (not on the phone) so the count follows
-- the person across the website, Android and any other device. The announcements
-- themselves (text, dates) are in the app code: src/announcements.js.
--
-- To see how an announcement did:
--   select announcement_id, count(*) shown_to, count(*) filter (where dismissed) got_it
--   from public.announcement_views group by 1;

create table if not exists public.announcement_views (
  user_id         uuid not null references auth.users(id) on delete cascade,
  announcement_id text not null,
  views           int  not null default 0,
  dismissed       boolean not null default false,
  first_shown_at  timestamptz,
  last_shown_at   timestamptz,
  primary key (user_id, announcement_id)
);

alter table public.announcement_views enable row level security;

drop policy if exists "announcement_views select own" on public.announcement_views;
drop policy if exists "announcement_views insert own" on public.announcement_views;
drop policy if exists "announcement_views update own" on public.announcement_views;
create policy "announcement_views select own" on public.announcement_views for select using (auth.uid() = user_id);
create policy "announcement_views insert own" on public.announcement_views for insert with check (auth.uid() = user_id);
create policy "announcement_views update own" on public.announcement_views for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
