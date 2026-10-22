-- Migration: owner-only admin dashboard (v4.10)
-- Run this once in the Supabase SQL editor.
--
-- HOW THE LOCK WORKS
--   1. `admins` holds the user ids allowed to see the dashboard. RLS is on and
--      there are NO policies, so the app (anon/authenticated roles) can never
--      read or change it — only the SQL editor / service role can.
--   2. admin_user_stats() is SECURITY DEFINER (it must read auth.users and other
--      people's rows) but checks `admins` for auth.uid() first and raises an error
--      for anyone else. The check is in the database, so it can't be bypassed from
--      the browser.
--   3. is_admin() only tells the app whether to show the menu item.
--   Returns username, email, sign-up date and counts only — no recipe content.

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
-- (intentionally no policies)

-- The owner account
insert into public.admins (user_id)
select id from auth.users where email = 'juansterthemonster@gmail.com'
on conflict do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

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
  collection_count   bigint
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
    (select count(*) from public.collections c where c.user_id = u.id)
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.created_at desc;
end;
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.admin_user_stats() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_user_stats() to authenticated;

-- Check it worked (should list your account):
--   select u.email from public.admins a join auth.users u on u.id = a.user_id;
