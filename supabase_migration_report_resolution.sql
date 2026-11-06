-- Mi Sazón — record WHAT was done about a report
-- Run once in the Supabase SQL editor (safe to re-run).
--
-- reports.resolution: 'made_private' | 'deleted' | 'dismissed' | null (null = nothing done yet)
-- The Reports screen shows: Unactioned (status open) · Actioned — made private / deleted · Dismissed.

alter table public.reports add column if not exists resolution text;

-- Backfill reports that were already handled
update public.reports set resolution = 'dismissed' where status = 'dismissed' and resolution is null;
update public.reports rp set resolution = 'deleted'
  where rp.status = 'actioned' and rp.resolution is null and rp.recipe_id is null;
update public.reports rp set resolution = 'made_private'
  where rp.status = 'actioned' and rp.resolution is null
    and exists (select 1 from public.recipes r where r.id = rp.recipe_id and r.is_public = false);

-- admin_reports now also returns resolution + resolved_at (return type changes, so drop first)
drop function if exists public.admin_reports(text);
create or replace function public.admin_reports(p_status text default 'open')
returns table (
  report_id       uuid,
  created_at      timestamptz,
  status          text,
  reason          text,
  note            text,
  recipe_id       uuid,
  recipe_name     text,
  recipe_is_public boolean,
  recipe_exists   boolean,
  author_id       uuid,
  author_username text,
  author_email    text,
  reporter_username text,
  reporter_email  text,
  author_open_reports bigint,
  resolution      text,
  resolved_at     timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.admins a where a.user_id = auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    rp.id, rp.created_at, rp.status, rp.reason, rp.note,
    rp.recipe_id,
    coalesce(r.name, rp.recipe_name),
    coalesce(r.is_public, false),
    r.id is not null,
    rp.author_id,
    pa.username, ua.email::text,
    pr.username, ur.email::text,
    (select count(*) from public.reports x
       where x.author_id = rp.author_id and x.status = 'open'),
    rp.resolution,
    rp.resolved_at
  from public.reports rp
  left join public.recipes r  on r.id  = rp.recipe_id
  left join public.profiles pa on pa.id = rp.author_id
  left join auth.users ua      on ua.id = rp.author_id
  left join public.profiles pr on pr.id = rp.reporter_id
  left join auth.users ur      on ur.id = rp.reporter_id
  where p_status is null or p_status = 'all' or rp.status = p_status
  order by rp.created_at desc
  limit 200;
end;
$$;

-- Taking a recipe down records how
create or replace function public.admin_take_down_recipe(p_recipe_id uuid, p_delete boolean default false)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.admins a where a.user_id = auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.reports
     set status = 'actioned', resolved_at = now(),
         resolution = case when p_delete then 'deleted' else 'made_private' end
   where recipe_id = p_recipe_id and status = 'open';

  if p_delete then
    delete from public.recipes where id = p_recipe_id;   -- reports.recipe_id -> null, snapshot kept
  else
    update public.recipes set is_public = false where id = p_recipe_id;
  end if;
end;
$$;

-- Dismiss / reopen records it too (reopen clears the resolution)
create or replace function public.admin_set_report_status(p_report_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.admins a where a.user_id = auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_status not in ('open','actioned','dismissed') then
    raise exception 'bad status';
  end if;
  update public.reports
     set status = p_status,
         resolved_at = case when p_status = 'open' then null else now() end,
         resolution  = case when p_status = 'dismissed' then 'dismissed' else null end
   where id = p_report_id;
end;
$$;

revoke all on function public.admin_reports(text) from public, anon;
grant execute on function public.admin_reports(text) to authenticated;
