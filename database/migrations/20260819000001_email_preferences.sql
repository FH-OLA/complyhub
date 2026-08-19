-- Sprint 6A: Email preferences + expand usage_events event_type allowlist
-- Apply AFTER 20260817000000_beta_operations.sql

BEGIN;

-- -------------------------------------------------------
-- 1. email_preferences
--    One row per user. Absence of a row means opted-in
--    (default-on for beta). RLS allows users to manage
--    only their own row. The unsubscribe endpoint uses
--    the service-role client and bypasses RLS; HMAC
--    verification substitutes for session auth there.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_preferences (
  user_id              uuid        PRIMARY KEY
                                   REFERENCES auth.users(id) ON DELETE CASCADE,
  email_alerts_enabled boolean     NOT NULL DEFAULT true,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- No secondary index on email_alerts_enabled.
-- The alert runner fetches preferences by user_id IN (...) (PK scan).
-- The settings page queries by user_id (PK scan).
-- A boolean index would not be used by any current query pattern.

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- SELECT: users may read their own preference row.
DROP POLICY IF EXISTS "Users can read own email preferences" ON public.email_preferences;
CREATE POLICY "Users can read own email preferences"
  ON public.email_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: users may create their own preference row.
DROP POLICY IF EXISTS "Users can insert own email preferences" ON public.email_preferences;
CREATE POLICY "Users can insert own email preferences"
  ON public.email_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: USING restricts which rows can be targeted;
-- WITH CHECK restricts what the updated row may contain.
-- Together they prevent cross-user modification and user_id changes.
DROP POLICY IF EXISTS "Users can update own email preferences" ON public.email_preferences;
CREATE POLICY "Users can update own email preferences"
  ON public.email_preferences FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy. Deleting a preference row would silently revert the user
-- to default-opted-in, which is not the intended UX for an explicit opt-out.

-- -------------------------------------------------------
-- 2. Expand usage_events event_type CHECK constraint
--    to include email preference change events.
--    PostgreSQL generates the name usage_events_event_type_check
--    for the inline column-level constraint defined in
--    20260817000000_beta_operations.sql.
-- -------------------------------------------------------
ALTER TABLE public.usage_events
  DROP CONSTRAINT IF EXISTS usage_events_event_type_check;

ALTER TABLE public.usage_events
  ADD CONSTRAINT usage_events_event_type_check
  CHECK (event_type IN (
    'company_searched',
    'company_tracked',
    'company_removed',
    'upgrade_clicked',
    'feedback_submitted',
    'email_alerts_disabled',
    'email_alerts_enabled'
  ));

COMMIT;
