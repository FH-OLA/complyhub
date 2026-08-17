-- Beta operations: feedback collection and usage event tracking
-- Sprint 5A — run this in the Supabase SQL editor before enabling beta features

BEGIN;

-- -------------------------------------------------------
-- 1. Beta feedback
--    Stores user-submitted feedback from the in-app widget.
--
--    user_id: NOT NULL with ON DELETE CASCADE — consistent with all other
--    user-owned tables (tracked_companies, user_subscriptions, alert_history).
--    Orphaned feedback rows are useless without a user; CASCADE also ensures
--    GDPR erasure requests are handled automatically when the account is deleted.
--
--    user_email: retained as a historical snapshot so the admin dashboard can
--    display a readable identity without a JOIN to auth.users (service-role
--    reads are expensive and auth.users is not directly queryable from SQL
--    functions on the free tier). The value is denormalised at insert time and
--    will be erased with the row when the user's account is deleted (CASCADE).
--    Do not backfill this column for rows inserted after a user changes email.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.beta_feedback (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email  text,
  message     text        NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  rating      integer     CHECK (rating BETWEEN 1 AND 5),
  page        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes: admin dashboard queries ORDER BY created_at DESC; user_id supports
-- per-user lookups should a self-service "my feedback" view be added later.
CREATE INDEX IF NOT EXISTS beta_feedback_created_at_idx ON public.beta_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS beta_feedback_user_id_idx    ON public.beta_feedback (user_id);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

-- RLS: INSERT-only for authenticated users. No SELECT/UPDATE/DELETE policies
-- are created deliberately — reads are performed exclusively via the Supabase
-- service-role key in the admin dashboard (app/admin/page.tsx), which bypasses
-- RLS entirely. This prevents users from reading each other's feedback while
-- keeping the admin query path simple.
DROP POLICY IF EXISTS "Users can submit own feedback" ON public.beta_feedback;
CREATE POLICY "Users can submit own feedback"
  ON public.beta_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------
-- 2. Usage events
--    Records key product interactions for operational insight.
--
--    user_id: NOT NULL with ON DELETE CASCADE — same rationale as beta_feedback.
--    Events without an owner have no analytical value and must not persist after
--    account deletion.
--
--    event_type: constrained to the exact allowlist defined in lib/events.ts.
--    Any attempt to insert an unlisted type (e.g. from a future client-side
--    bug or a crafted request that bypasses API validation) will be rejected
--    at the database level, keeping the events table clean for aggregation.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usage_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  text        NOT NULL CHECK (event_type IN (
                            'company_searched',
                            'company_tracked',
                            'company_removed',
                            'upgrade_clicked',
                            'feedback_submitted'
                          )),
  properties  jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes: admin dashboard queries ORDER BY created_at DESC; user_id supports
-- per-user funnels; event_type supports aggregation queries (e.g. COUNT per type).
CREATE INDEX IF NOT EXISTS usage_events_created_at_idx ON public.usage_events (created_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_user_id_idx    ON public.usage_events (user_id);
CREATE INDEX IF NOT EXISTS usage_events_event_type_idx ON public.usage_events (event_type);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- RLS: INSERT-only for authenticated users. No SELECT/UPDATE/DELETE policies
-- are created deliberately — reads are performed exclusively via the Supabase
-- service-role key in the admin dashboard (app/admin/page.tsx), which bypasses
-- RLS entirely.
DROP POLICY IF EXISTS "Users can insert own events" ON public.usage_events;
CREATE POLICY "Users can insert own events"
  ON public.usage_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMIT;
