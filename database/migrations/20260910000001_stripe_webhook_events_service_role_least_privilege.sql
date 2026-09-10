-- Sprint E2.3: Reduce service_role to least privilege on the Stripe
--              webhook idempotency table
-- Apply AFTER 20260910000000_stripe_webhook_events_security.sql
--
-- WHY THIS MIGRATION EXISTS
--
-- 20260910000000 granted service_role SELECT, INSERT, DELETE, but GRANT is
-- additive: it cannot remove privileges already held. Supabase's default
-- privileges for schema public (ALTER DEFAULT PRIVILEGES ... GRANT ALL ON
-- TABLES TO ... service_role) fire at CREATE TABLE time, so service_role
-- already held ALL. Production ACLs confirm the outcome:
--
--   DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
--
-- The intended privilege set is SELECT, INSERT, DELETE. The surplus matters
-- because service_role is the role the Stripe webhook runs as, and the
-- SUPABASE_SERVICE_ROLE_KEY is a single credential:
--
--   • TRUNCATE would let a bug or a leaked key erase the entire idempotency
--     ledger, making every historical Stripe event replayable.
--   • UPDATE would allow event_id values to be rewritten, silently breaking
--     the duplicate-delivery guarantee the PRIMARY KEY provides.
--   • REFERENCES / TRIGGER are unused and expand the surface for no benefit.
--
-- REVOKE-then-GRANT is the only way to reach an exact privilege set; a bare
-- GRANT cannot subtract. Both statements run inside one transaction, so other
-- sessions observe either the old or the new ACL and never an intermediate
-- state with no privileges — webhook processing cannot be interrupted.
--
-- This migration does not modify any earlier migration.
--
-- Deliberately unchanged:
--   • RLS on the table (already enabled, no policies — deny-all).
--   • The PUBLIC / anon / authenticated revocations from 20260910000000.
--   • The event_id PRIMARY KEY and every other database object.

BEGIN;

-- -------------------------------------------------------
-- 1. Remove all table privileges from service_role.
--    Clears the surplus granted by schema default privileges.
--    Idempotent: a no-op when nothing is held.
-- -------------------------------------------------------
REVOKE ALL ON TABLE public.stripe_webhook_events FROM service_role;

-- -------------------------------------------------------
-- 2. Grant back exactly what app/api/stripe/webhook/route.ts uses:
--
--      INSERT  — the idempotency claim
--                (line 46, .insert({ event_id }))
--      DELETE  — the claim release so Stripe can safely retry
--                (line 220, .delete().eq('event_id', ...))
--      SELECT  — required by PostgreSQL for any column read in a
--                WHERE condition; the claim-release DELETE filters
--                on event_id. Not granted for reading rows back:
--                neither call chains .select(), so supabase-js sends
--                no `Prefer: return=representation` and PostgREST
--                returns no rows.
--
--    Still withheld: UPDATE, TRUNCATE, REFERENCES, TRIGGER.
-- -------------------------------------------------------
GRANT SELECT, INSERT, DELETE ON TABLE public.stripe_webhook_events TO service_role;

COMMIT;
