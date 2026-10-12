-- Mi Sazón — collection description + custom cover photo
-- Run once in the Supabase SQL editor BEFORE using the new collection edit modal.
--
-- description:     optional free text shown on the collection page.
-- cover_photo_url: optional photo chosen from a recipe in the collection.
--                  When null, the card falls back to the 2x2 photo collage.
-- Existing row-level-security policies on `collections` already cover these
-- columns (they are per-row, not per-column), so no policy changes are needed.

alter table public.collections
  add column if not exists description text,
  add column if not exists cover_photo_url text;
