-- Mi Sazón — per-user interface language (English / French / Spanish)
-- Run once in the Supabase SQL editor.
--
-- The language chosen in Profile & settings is stored on the user's profile row
-- so it follows them across devices. NULL = not chosen yet (the app then uses the
-- browser's language). The existing RLS on `profiles` is per-row, so users can
-- already update their own row; no policy changes are needed.

alter table public.profiles
  add column if not exists language text
  check (language in ('en', 'fr', 'es'));
