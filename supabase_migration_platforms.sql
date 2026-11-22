-- Migration: which platform(s) each account uses (v4.47)
-- Run this once in the Supabase SQL editor.
--
-- profiles.platforms  the platforms this account has opened the app on: any of 'web', 'android', 'ios'.
--                     One person can use several, so it is a set that only ever grows.
-- record_platform()   each client calls it once per launch/sign-in. It adds the platform if missing.
--                     Only touches the caller's own row (auth.uid()), and only accepts the three known values.
-- admin_user_stats()  now also returns `platforms` for the admin dashboard.
--
-- Accounts that haven't opened the app since this ships show "—" until their next launch.

alter table public.profiles
  add column if not exists platforms text[] not null default '{}';

create or replace function public.record_platform(p_platform text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set platforms = array_append(platforms, p_platform)
   where id = auth.uid()
     and p_platform in ('web', 'android', 'ios')
     and not (p_platform = any(platforms));
$$;

revoke all on function public.record_platform(text) from public, anon;
grant execute on function public.record_platform(text) to authenticated;

-- (dropped first because the returned columns changed)
drop function if exists public.admin_user_stats();
create or replace function public.admin_user_stats()
returns table (
  profile_id         uuid,
  username           text,
  email              text,
  signed_up          timestamptz,
  recipe_count       bigint,
  public_recipe_count bigint,
  liked_count        bigint,
  collection_count   bigint,
  platforms          text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admins a where a.user_id = auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    p.username,
    u.email::text,
    u.created_at,
    (select count(*) from public.recipes r where r.user_id = u.id),
    (select count(*) from public.recipes r where r.user_id = u.id and r.is_public),
    (select count(*) from public.likes l where l.user_id = u.id),
    (select count(*) from public.collections c where c.user_id = u.id),
    coalesce(p.platforms, '{}')
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.created_at desc;
end;
$$;

revoke all on function public.admin_user_stats() from public, anon;
grant execute on function public.admin_user_stats() to authenticated;

-- ── Detect iOS without an app update ─────────────────────────────────────────
-- The iOS app (Swift) uses the supabase-swift library, which sends an `x-client-info: supabase-swift/<ver>`
-- header on every request. PostgREST exposes request headers to SQL, so these statement-level triggers
-- tag the caller as 'ios' the first time an iOS build writes a recipe, like or collection.
-- (Web and Android report themselves through record_platform(); once the iOS app also calls
-- record_platform('ios') on launch, browse-only iOS users are covered too.)
create or replace function public.tag_platform_from_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hdrs json;
  client_info text;
begin
  begin
    hdrs := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    return null;
  end;
  if hdrs is null or auth.uid() is null then return null; end if;

  client_info := lower(coalesce(hdrs ->> 'x-client-info', ''));
  if client_info like 'supabase-swift%' then
    update public.profiles
       set platforms = array_append(platforms, 'ios')
     where id = auth.uid() and not ('ios' = any(platforms));
  end if;
  return null;
end;
$$;

drop trigger if exists tag_platform_recipes     on public.recipes;
drop trigger if exists tag_platform_likes       on public.likes;
drop trigger if exists tag_platform_collections on public.collections;
create trigger tag_platform_recipes     after insert on public.recipes     for each statement execute function public.tag_platform_from_request();
create trigger tag_platform_likes       after insert on public.likes       for each statement execute function public.tag_platform_from_request();
create trigger tag_platform_collections after insert on public.collections for each statement execute function public.tag_platform_from_request();
