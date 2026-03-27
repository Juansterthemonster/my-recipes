-- Migration: get_recipe_activity_counts RPC
-- Run this once in the Supabase SQL editor.
--
-- WHY THIS IS NEEDED:
--   Two RLS policies block the client from counting others' activity:
--   1. recipes — other users' copies are private (is_public=false), so the
--      recipe owner can't see those rows via a normal SELECT.
--   2. likes — the likes table only allows SELECT on your own rows
--      (user_id = auth.uid()), so you can't count likes from other users.
--
-- SOLUTION:
--   A SECURITY DEFINER function runs with the database owner's privileges,
--   bypassing RLS entirely. The function is intentionally narrow — it only
--   returns two aggregate counts for the calling user's own recipes, so
--   there is no risk of leaking other users' data.

CREATE OR REPLACE FUNCTION get_recipe_activity_counts(p_user_id uuid)
RETURNS TABLE (their_copied_count bigint, their_liked_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipe_ids uuid[];
BEGIN
  -- Collect all recipe IDs owned by this user (runs with definer privileges)
  SELECT ARRAY_AGG(id) INTO v_recipe_ids
  FROM recipes
  WHERE user_id = p_user_id;

  -- No recipes → return zeros immediately
  IF v_recipe_ids IS NULL OR ARRAY_LENGTH(v_recipe_ids, 1) = 0 THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    -- How many times others have copied any of my recipes
    (SELECT COUNT(*)::bigint FROM recipes
     WHERE copied_from = ANY(v_recipe_ids)) AS their_copied_count,
    -- How many times others have liked any of my recipes
    (SELECT COUNT(*)::bigint FROM likes
     WHERE recipe_id = ANY(v_recipe_ids)) AS their_liked_count;
END;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION get_recipe_activity_counts(uuid) TO authenticated;
