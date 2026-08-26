-- Sprint 8.5: Stripe webhook idempotency table
--
-- Stripe guarantees at-least-once delivery: the same event can be delivered
-- more than once. The webhook handler (app/api/stripe/webhook/route.ts)
-- inserts the event ID here before processing. A subsequent delivery of the
-- same event will hit the PRIMARY KEY unique constraint and return 200
-- immediately without re-processing.
--
-- No RLS is applied: this table is accessed exclusively by the Stripe webhook
-- handler via the service-role client, which bypasses RLS entirely.
-- No user foreign key: webhook events exist independently of user accounts.

BEGIN;

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id     text        PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
