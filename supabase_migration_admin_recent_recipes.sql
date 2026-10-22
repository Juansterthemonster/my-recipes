-- Migration: admin "new recipes" feed (v4.11)
-- Run once in the Supabase SQL editor (after supabase_migration_admin_dashboard.sql).
-- Same lock as the user table: raises 'not authorized' unless auth.uid() is in `admins`.

create or replace function public.admin_recent_recipes(p_limit int default 50)
returns table (
  recipe_id       uuid,
  recipe_name     text,
  author_username text,
  author_email    text,
  created_at      timestamptz,
  is_public       boolean,
  is_copy         boolean
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
    r.id,
    r.name,
    p.username,
    u.email::text,
    r.created_at,
    coalesce(r.is_public, false),
    r.copied_from is not null
  from public.recipes r
  left join public.profiles p on p.id = r.user_id
  left join auth.users u on u.id = r.user_id
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
end;
$$;

revoke all on function public.admin_recent_recipes(int) from public, anon;
grant execute on function public.admin_recent_recipes(int) to authenticated;
