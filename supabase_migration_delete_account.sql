-- Migration: self-service account deletion (v4.15)
-- Run once in the Supabase SQL editor.
--
-- delete_my_account() is SECURITY DEFINER (a normal user can't delete from
-- auth.users) but it can only ever act on the CALLER: it uses auth.uid() and
-- takes no arguments, so nobody can delete someone else's account.
-- Rows are deleted explicitly, child tables first, so it works regardless of
-- which foreign keys have ON DELETE CASCADE.
-- NOTE: photo files in Cloudflare R2 are not touched by this function.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  delete from public.collection_recipes
    where collection_id in (select c.id from public.collections c where c.user_id = uid);
  delete from public.collections where user_id = uid;
  delete from public.likes where user_id = uid;
  delete from public.recipes where user_id = uid;
  delete from public.profiles where id = uid;
  delete from public.admins where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
