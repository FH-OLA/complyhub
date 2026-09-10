-- Sprint E2.3: Secure the Stripe webhook idempotency table
-- Apply AFTER 20260826000001_stripe_webhook_events.sql
--
-- WHY THIS MIGRATION EXISTS
--
-- 20260826000001 created public.stripe_webhook_events with no RLS, on the
-- assumption that "only the service-role client touches it, and service_role
-- bypasses RLS". That assumption is unsafe on this project: the public schema's
-- default ACL grants table privileges to `anon` and `authenticated`, and both
-- roles hold USAGE on schema public. A table in public with no RLS is therefore
-- reachable through the Supabase Data API (PostgREST) by any browser client
-- holding the anon key — which is shipped to every visitor.
--
-- public.stripe_webhook_events is an INTERNAL billing-integrity table. It is the
-- idempotency ledger for Stripe webhook delivery and MUST NOT be readable or
-- writable through the Data API by browser roles. Exposure would let a caller
-- enumerate Stripe event IDs, or — far worse — pre-insert an event_id to make
-- the webhook treat a genuine delivery as a duplicate and silently skip the
-- subscription mutation, or delete rows to force reprocessing.
--
-- This migration does not modify the historical migration. It is additive and
-- safe to run whether the table already exists or not.
--
-- Access model after this migration:
--   • anon / authenticated : no table privileges, and RLS with no policies.
--   • service_role         : SELECT, INSERT, DELETE (see below); bypasses RLS.
--   • table owner          : unchanged (owners are not subject to RLS).

BEGIN;

-- -------------------------------------------------------
-- 1. Table
--    IF NOT EXISTS so this is safe both when 20260826000001
--    was never applied and when it was. The definition is
--    byte-identical to the original: event_id as PRIMARY KEY
--    is the idempotency guarantee the webhook depends on
--    (duplicate delivery raises 23505 and returns 200), so it
--    must not be weakened or replaced.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id     text        PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------
-- 2. Row Level Security
--    Enabled with NO policies. For any role that does not
--    bypass RLS this is deny-all: zero rows readable, zero
--    rows writable. service_role bypasses RLS, so webhook
--    processing is unaffected.
--
--    Deliberately NOT using FORCE ROW LEVEL SECURITY — that
--    would also subject the table owner to RLS and break
--    future migrations and admin access.
--
--    No policy is created for anon or authenticated. There is
--    no legitimate browser access path to this table.
-- -------------------------------------------------------
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- 3. Revoke browser-role privileges
--    RLS alone would already deny these roles, but privileges
--    and RLS are independent mechanisms. Revoking both means a
--    future policy added by mistake cannot silently open the
--    table, and PostgREST will not advertise it to anon or
--    authenticated at all.
--
--    PUBLIC is revoked as well: the grant chain that exposed
--    this table came from schema-level defaults, and any grant
--    to PUBLIC would be inherited by every role including anon.
-- -------------------------------------------------------
REVOKE ALL ON TABLE public.stripe_webhook_events FROM PUBLIC;
REVOKE ALL ON TABLE public.stripe_webhook_events FROM anon;
REVOKE ALL ON TABLE public.stripe_webhook_events FROM authenticated;

-- -------------------------------------------------------
-- 4. Grant service_role exactly what the webhook uses
--    Derived from app/api/stripe/webhook/route.ts:
--
--      line 44-46  .from('stripe_webhook_events')
--                  .insert({ event_id })            -> INSERT
--
--      line 218-221 .from('stripe_webhook_events')
--                   .delete().eq('event_id', ...)   -> DELETE
--                                                      + SELECT
--
--    SELECT is required because PostgreSQL requires SELECT
--    privilege on any column read in a WHERE condition, and the
--    claim-release DELETE filters on event_id. It is not granted
--    for reading rows back: neither call chains .select(), so
--    supabase-js sends no `Prefer: return=representation` and
--    PostgREST returns no rows.
--
--    Deliberately NOT granted: UPDATE (rows are only inserted or
--    deleted, never mutated), TRUNCATE, REFERENCES, TRIGGER.
--    No sequence grants are needed — event_id is a text primary
--    key supplied by Stripe, not a generated identity column.
-- -------------------------------------------------------
GRANT SELECT, INSERT, DELETE ON TABLE public.stripe_webhook_events TO service_role;

COMMIT;
