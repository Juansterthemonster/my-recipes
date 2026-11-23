-- Migration: remember where an imported recipe came from (v4.48)
-- Run this once in the Supabase SQL editor.
--
-- recipes.source_url  the web page a recipe was imported from ("Import from a link" on the New recipe screen).
--                     NULL for every other recipe. The recipe page shows it as "Source · site.com" (http/https only).

alter table public.recipes
  add column if not exists source_url text;
