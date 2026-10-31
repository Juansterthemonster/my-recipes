-- Mi Sazón — short share codes for recipe links
-- Run once in the Supabase SQL editor, BEFORE deploying the new share links.
--
-- Every recipe gets a random 4-character code (a–z, 0–9, ~1.7 million combinations) that is
-- unique across ALL recipes. Share links become  misazon.app/recipe/lemon-chicken-k7x2
-- (name part is cosmetic; the code finds the recipe). Old links keep working.
-- The functions are SECURITY DEFINER so the uniqueness check also sees other people's private
-- recipes (row-level security would otherwise hide them from the check).

alter table public.recipes add column if not exists short_code text;

create or replace function public.gen_short_code() returns text
language plpgsql security definer set search_path = public as $$
declare
  chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..4 loop
      code := code || substr(chars, 1 + floor(random() * 36)::int, 1);
    end loop;
    exit when not exists (select 1 from public.recipes where short_code = code);
  end loop;
  return code;
end $$;

-- Existing recipes
do $$
declare r record;
begin
  for r in select id from public.recipes where short_code is null loop
    update public.recipes set short_code = public.gen_short_code() where id = r.id;
  end loop;
end $$;

create unique index if not exists recipes_short_code_key on public.recipes (short_code);

-- New recipes (including copies of someone else's recipe) always get their own fresh code
create or replace function public.set_short_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.short_code := public.gen_short_code();
  return new;
end $$;

drop trigger if exists recipes_set_short_code on public.recipes;
create trigger recipes_set_short_code
  before insert on public.recipes
  for each row execute function public.set_short_code();
