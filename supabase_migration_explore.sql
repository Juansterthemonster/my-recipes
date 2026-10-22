-- Migration: "Latest recipes added" + Explore dot (v4.12)
-- Run once in the Supabase SQL editor.

-- 1. When a recipe became public (drives "Latest recipes added" on Explore)
alter table public.recipes add column if not exists made_public_at timestamptz;

-- Existing public recipes: use the date they were created
update public.recipes set made_public_at = created_at
where is_public = true and made_public_at is null;

-- Stamp it automatically whenever a recipe is inserted as public or switched to public
create or replace function public.set_made_public_at()
returns trigger
language plpgsql
as $$
begin
  if new.is_public is true and (tg_op = 'INSERT' or old.is_public is distinct from true) then
    new.made_public_at := now();
  end if;
  return new;
end;
$$;

create or replace trigger recipes_set_made_public_at
before insert or update of is_public on public.recipes
for each row execute function public.set_made_public_at();

-- 2. When each person last opened Explore (drives the dot on the Explore tab)
alter table public.profiles add column if not exists explore_seen_at timestamptz;
