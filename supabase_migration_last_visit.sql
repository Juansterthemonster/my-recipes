-- Migration: last visit per user in the admin Users table (v4.51)
-- Run this once in the Supabase SQL editor.
--
-- admin_user_stats() now also returns `last_visit`: the most recent of the account's last sign-in and its
-- latest session activity (auth.sessions.updated_at, which moves forward each time the app refreshes the
-- login while it is open, roughly hourly). So someone who stays signed in still shows when they last used the app.
-- Limits: precision is about an hour; a signed-out user falls back to their last sign-in time.

drop function if exists public.admin_user_stats();
create or replace function public.admin_user_stats()
returns table (
  profile_id         uuid,
  username           text,
  email              text,
  signed_up          timestamptz,
  last_visit         timestamptz,
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
    greatest(u.last_sign_in_at, (select max(se.updated_at) from auth.sessions se where se.user_id = u.id)),
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
