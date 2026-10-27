-- Sazón — indexes for the common lookups (reduces Disk IO as the tables grow).
-- Safe to run more than once; changes no data and no behaviour, only speeds up reads.
-- Paste into Supabase → SQL Editor → Run. (If it warns about "destructive operations", it's
-- a generic warning — there are no drops or deletes here.)

-- "My recipes": filter by owner, newest first
create index if not exists recipes_user_created_idx
  on public.recipes (user_id, created_at desc);

-- Explore: public recipes, newest first / newest made-public (partial indexes stay tiny)
create index if not exists recipes_public_created_idx
  on public.recipes (created_at desc) where is_public;
create index if not exists recipes_public_made_public_idx
  on public.recipes (made_public_at desc nulls last) where is_public;

-- Deleting a recipe checks "does any copy point at it" (copied_from foreign key)
create index if not exists recipes_copied_from_idx
  on public.recipes (copied_from) where copied_from is not null;

-- Collections and their recipes
create index if not exists collections_user_idx
  on public.collections (user_id, created_at desc);
create index if not exists collection_recipes_collection_idx
  on public.collection_recipes (collection_id);
create index if not exists collection_recipes_recipe_idx
  on public.collection_recipes (recipe_id);

-- Likes by recipe (counts / cascade checks). likes(user_id, recipe_id) is already the primary key.
create index if not exists likes_recipe_idx
  on public.likes (recipe_id);
