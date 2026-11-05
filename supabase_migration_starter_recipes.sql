-- =====================================================================
-- Mi Sazón – starter recipes
-- Every account gets its own private copy of the recipes listed in
-- `starter_recipes` (new accounts: automatically; existing accounts: once, below).
-- The copies belong to the user, so they can edit or delete them freely.
-- Safe to re-run: nobody receives the same starter twice.
-- =====================================================================

-- (Applied 2026-11-04.)

-- Marks a copy as a starter and stores who it is "by" (the app shows "by @name" and hides the
-- "edited by you" / "added to my recipes" lines for these).
alter table public.recipes add column if not exists starter_by text;

-- 1. Which recipes are the starters (private: no policies, so the app can't read it)
create table if not exists public.starter_recipes (
  recipe_id uuid primary key references public.recipes(id) on delete cascade
);
alter table public.starter_recipes enable row level security;

-- The two starters (ids of the originals in the owner's account)
insert into public.starter_recipes (recipe_id) values
  ('e4ca0f39-c3bd-40e7-9bb1-cafcb0d4968e'),   -- Broiled salmon with Mayonnaise (Sample)
  ('c16802c8-742b-420a-899b-bc62a362d145')    -- Chimichurri Sauce (Sample)
on conflict do nothing;

-- 2. Give one user their copies
create or replace function public.give_starter_recipes(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.recipes;
  author text;
begin
  for r in
    select rec.* from public.recipes rec
    join public.starter_recipes s on s.recipe_id = rec.id
    where rec.user_id <> uid
      and not exists (select 1 from public.recipes c where c.user_id = uid and c.copied_from = rec.id)
  loop
    select username into author from public.profiles where id = r.user_id;
    insert into public.recipes
    select * from jsonb_populate_record(
      null::public.recipes,
      (to_jsonb(r) - 'short_code' - 'last_opened_at' - 'is_modified')
        || jsonb_build_object(
             'id', gen_random_uuid(),
             'user_id', uid,
             'is_public', false,
             'copied_from', r.id,
             'starter_by', coalesce(author, 'juanster'),
             'created_at', r.created_at,
             'updated_at', r.created_at)
    );
  end loop;
end;
$$;

-- 3. New accounts get them automatically
create or replace function public.starter_recipes_on_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.give_starter_recipes(new.id);
  return new;
end;
$$;

drop trigger if exists give_starter_recipes_on_signup on public.profiles;
create trigger give_starter_recipes_on_signup
  after insert on public.profiles
  for each row execute function public.starter_recipes_on_profile();

-- 4. Existing accounts get them now (one time)
select public.give_starter_recipes(id) from public.profiles;

-- Check: how many accounts now have each starter
-- select r.name, count(*) from public.recipes r
-- where r.copied_from in (select recipe_id from public.starter_recipes) group by r.name;
