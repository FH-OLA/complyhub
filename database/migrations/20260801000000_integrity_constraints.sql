-- ============================================================
-- ComplyHub Database Migration
-- File: 20260801000000_integrity_constraints.sql
--
-- Purpose:
--   • Remove duplicate tracked_companies RLS policies
--   • Enforce NOT NULL on user ownership columns
--   • Ensure ON DELETE CASCADE for auth.users foreign keys
--   • Enforce uniqueness for Stripe identifiers
--   • Restrict subscription plans to supported values
--
-- Notes:
--   • tracked_companies foreign key updated from
--     ON DELETE NO ACTION to ON DELETE CASCADE.
--   • alert_history already had the correct CASCADE foreign key.
--   • This migration reflects the production schema after
--     verification and successful application.
-- ============================================================

BEGIN;

-- ============================================================
-- ComplyHub — Revised Integrity Constraints Migration
-- Accounts for foreign keys already present in production.
-- Successfully applied on 2026-08-01.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Remove only the confirmed duplicate RLS policies.
-- The equivalent "...tracked companies" policies remain.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Users can delete their own companies"
  ON public.tracked_companies;

DROP POLICY IF EXISTS "Users can insert their own companies"
  ON public.tracked_companies;

DROP POLICY IF EXISTS "Users can view their own companies"
  ON public.tracked_companies;

-- ------------------------------------------------------------
-- 2. Prevent ownerless rows.
-- Preflight confirmed that no existing user_id values are NULL.
-- ------------------------------------------------------------

ALTER TABLE public.tracked_companies
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.user_subscriptions
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.alert_history
  ALTER COLUMN user_id SET NOT NULL;

-- ------------------------------------------------------------
-- 3. Replace the existing tracked_companies foreign key.
-- It previously used NO ACTION; recreate it with CASCADE.
-- ------------------------------------------------------------

ALTER TABLE public.tracked_companies
  DROP CONSTRAINT IF EXISTS tracked_companies_user_id_fkey;

ALTER TABLE public.tracked_companies
  ADD CONSTRAINT tracked_companies_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- ------------------------------------------------------------
-- 4. Add the missing user_subscriptions foreign key.
-- ------------------------------------------------------------

ALTER TABLE public.user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- ------------------------------------------------------------
-- 5. alert_history already had the correct CASCADE foreign key.
-- No changes required.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 6. Protect Stripe identifiers from duplicate non-null values.
-- PostgreSQL permits multiple NULL values.
-- ------------------------------------------------------------

ALTER TABLE public.user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_stripe_subscription_id_key;

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_stripe_subscription_id_key
  UNIQUE (stripe_subscription_id);

ALTER TABLE public.user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_stripe_customer_id_key;

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_stripe_customer_id_key
  UNIQUE (stripe_customer_id);

-- ------------------------------------------------------------
-- 7. Restrict subscription plans to supported application values.
-- ------------------------------------------------------------

ALTER TABLE public.user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_plan_check;

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_plan_check
  CHECK (plan IN ('free', 'pro'));

COMMIT;