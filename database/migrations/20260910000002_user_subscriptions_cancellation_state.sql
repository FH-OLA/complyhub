-- Sprint E2.3: Persist scheduled-cancellation state on user_subscriptions
-- Apply AFTER 20260910000001_stripe_webhook_events_service_role_least_privilege.sql
--
-- WHY THIS MIGRATION EXISTS
--
-- When a customer cancels through the Stripe Customer Portal with "cancel at
-- period end", Stripe keeps the subscription status as 'active' until the
-- period actually ends, and fires customer.subscription.updated with
-- cancel_at_period_end = true. The webhook previously persisted only `status`,
-- so that update was indistinguishable from any other: the row stayed
-- plan='pro'/status='active' (correct — the customer keeps Pro until the end
-- date) but ComplyHub had no way to know a cancellation was scheduled, and no
-- way to tell the customer when their access ends.
--
-- These two columns close that gap. They are additive and carry safe defaults,
-- so existing rows remain valid without a backfill:
--
--   cancel_at_period_end  false — no scheduled cancellation is the correct
--                                 assumption for every existing row; the next
--                                 customer.subscription.updated for a genuinely
--                                 cancelling subscription will set it true.
--   current_period_end    NULL  — unknown until the next subscription event.
--                                 Only read when cancel_at_period_end is true.
--
-- Both ADD COLUMN statements are metadata-only on PostgreSQL 11+ (a NOT NULL
-- column with a constant DEFAULT does not rewrite the table), so this is safe
-- to apply to a live table.
--
-- Entitlement semantics are deliberately unchanged: Pro access remains
-- (plan = 'pro' AND status = 'active'). A scheduled cancellation must NOT
-- revoke access early — that is the whole point of cancelling at period end.

BEGIN;

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

COMMIT;
