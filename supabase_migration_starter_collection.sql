-- =====================================================================
-- Mi Sazón – starter (sample) collection
-- Every account gets a private "Sample collection" holding its own copies of the starter recipes
-- (the same two samples created by supabase_migration_starter_recipes.sql: run that one first).
-- New accounts: automatically (right after their starter recipes). Existing accounts: once, below.
-- Safe to re-run: nobody gets a second sample collection, and a recipe is never added twice.
-- Run once in the Supabase SQL editor.
-- =====================================================================

-- Marks the sample collection so it is found again instead of duplicated
alter table public.collections add column if not exists is_starter boolean not null default false;

-- 1. Give one user their sample collection (skipped when they have none of the starter copies,
--    e.g. they deleted both recipes)
create or replace function public.give_starter_collection(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  if not exists (
    select 1 from public.recipes c
    join public.starter_recipes s on s.recipe_id = c.copied_from
    where c.user_id = uid
  ) then
    return;
  end if;

  select id into cid from public.collections where user_id = uid and is_starter limit 1;
  if cid is null then
    insert into public.collections (user_id, name, description, is_starter)
    values (uid, 'Sample collection', 'Two sample recipes to get you started.', true)
    returning id into cid;
  end if;

  insert into public.collection_recipes (collection_id, recipe_id)
  select cid, c.id
  from public.recipes c
  join public.starter_recipes s on s.recipe_id = c.copied_from
  where c.user_id = uid
    and not exists (
      select 1 from public.collection_recipes cr
      where cr.collection_id = cid and cr.recipe_id = c.id
    );
end;
$$;

-- 2. New accounts: collection right after the starter recipes
create or replace function public.starter_recipes_on_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.give_starter_recipes(new.id);
  perform public.give_starter_collection(new.id);
  return new;
end;
$$;

-- (the trigger give_starter_recipes_on_signup already calls this function, so it needs no change)

-- 3. Existing accounts get it now (one time)
select public.give_starter_collection(id) from public.profiles;

-- Check: how many accounts have the sample collection, and how many recipes it holds on average
-- select count(*) as accounts, round(avg(n), 1) as avg_recipes from (
--   select c.id, count(cr.recipe_id) as n from public.collections c
--   left join public.collection_recipes cr on cr.collection_id = c.id
--   where c.is_starter group by c.id) t;
