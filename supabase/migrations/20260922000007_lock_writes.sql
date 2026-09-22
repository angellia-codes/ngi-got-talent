-- Defence in depth on top of the RLS migration.
--
-- Supabase grants INSERT/UPDATE/DELETE on every new public table to anon and
-- authenticated by default; RLS is what actually blocks the write, since no
-- write policy exists. That is one lock. Revoking the grants as well means a
-- permissive policy added by mistake in a later phase still cannot open a hole
-- on its own.
--
-- CONSEQUENCE FOR LATER PHASES: adding a write policy is no longer enough on
-- its own. Privileged writes go through SECURITY DEFINER functions, which run
-- as the owner and are unaffected by these revokes — that is the intended path
-- for every admin and judge action.

revoke insert, update, delete on all tables in schema public from anon, authenticated;

-- Future tables inherit the same posture, so this does not have to be
-- remembered in phases 2 through 4.
alter default privileges in schema public
  revoke insert, update, delete on tables from anon, authenticated;
