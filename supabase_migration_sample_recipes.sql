-- Signed-out visitors can read ONLY the sample recipes (the originals listed in starter_recipes).
-- (Run 2026-11-24.) Used by Browse.jsx (signed-out My Recipes / Collections) and the iOS app.
create or replace function public.sample_recipes()
returns setof public.recipes
language sql
stable
security definer
set search_path = public
as $$
  select r.*
  from public.recipes r
  join public.starter_recipes s on s.recipe_id = r.id
  order by r.created_at asc;
$$;

revoke all on function public.sample_recipes() from public;
grant execute on function public.sample_recipes() to anon, authenticated;
