-- Mi Sazón — multi-photo support for recipes
-- Run once in the Supabase SQL editor.
--
-- `photo_url` is kept as-is and continues to work everywhere it already did
-- (recipe cards, collection collages) — the app always keeps it in sync as
-- photos[0], the "cover" photo. `photos` is the full ordered gallery, only
-- read by the recipe Detail view and the add/edit form.

alter table public.recipes
  add column if not exists photos jsonb default '[]'::jsonb;

-- Backfill: give existing recipes with a photo_url a matching one-item
-- gallery, so photos and photo_url agree for every row from the start.
update public.recipes
set photos = jsonb_build_array(photo_url)
where photo_url is not null
  and (photos is null or photos = '[]'::jsonb);
