-- Mi Sazón — sorting (My Recipes / Explore)
-- Run once in the Supabase SQL editor, BEFORE deploying the sort feature (it also works
-- before, it just can't save the "recently opened/edited" data).
--
-- recipes.updated_at     set by the app when the owner saves an edit ("Recently edited")
-- recipes.last_opened_at set by the app when the owner opens their own recipe ("Recently opened")
-- profiles.my_recipes_sort  the My Recipes sort the user picked, so it follows them across devices
--
-- Existing RLS (owner can update own recipes / own profile row) already covers these writes.

alter table public.recipes
  add column if not exists updated_at timestamptz,
  add column if not exists last_opened_at timestamptz;

-- Existing recipes: "edited" starts at the date they were created.
update public.recipes set updated_at = created_at where updated_at is null;

alter table public.profiles
  add column if not exists my_recipes_sort text
  check (my_recipes_sort in ('newest', 'oldest', 'az', 'za', 'random', 'opened', 'edited'));
