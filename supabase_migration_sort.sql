-- Mi Sazón — sorting (My Recipes / Explore)
-- Run once in the Supabase SQL editor, BEFORE deploying the sort feature (the app also works
-- before it, it just can't save "recently opened/edited" or the chosen sort).
--
-- recipes.updated_at        set by the app when the owner saves an edit ("Recently edited")
-- profiles.my_recipes_sort  the My Recipes sort the user picked, so it follows them across devices
-- recipe_opens              PRIVATE table: when each user last opened each of their recipes
--                           ("Recently opened"). Only the owner can read or write their own rows,
--                           so nobody else can see when you opened anything.

alter table public.recipes
  add column if not exists updated_at timestamptz;

-- Existing recipes: "edited" starts at the date they were created.
update public.recipes set updated_at = created_at where updated_at is null;

-- An earlier draft stored the opened time on the recipe itself (readable by others); remove it.
alter table public.recipes drop column if exists last_opened_at;

alter table public.profiles
  add column if not exists my_recipes_sort text
  check (my_recipes_sort in ('newest', 'oldest', 'az', 'za', 'random', 'opened', 'edited'));

create table if not exists public.recipe_opens (
  user_id   uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  opened_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

alter table public.recipe_opens enable row level security;

drop policy if exists "recipe_opens select own" on public.recipe_opens;
drop policy if exists "recipe_opens insert own" on public.recipe_opens;
drop policy if exists "recipe_opens update own" on public.recipe_opens;
drop policy if exists "recipe_opens delete own" on public.recipe_opens;
create policy "recipe_opens select own" on public.recipe_opens for select using (auth.uid() = user_id);
create policy "recipe_opens insert own" on public.recipe_opens for insert with check (auth.uid() = user_id);
create policy "recipe_opens update own" on public.recipe_opens for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recipe_opens delete own" on public.recipe_opens for delete using (auth.uid() = user_id);
