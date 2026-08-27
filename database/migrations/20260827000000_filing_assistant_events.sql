-- Sprint 10: AI Filing Assistant
-- Apply AFTER 20260826000002_ai_quota_index.sql
--
-- Two operations:
--   1. Expand usage_events_event_type_check to include ai_filing_opened.
--      This is a client-side analytics event inserted by the browser when
--      a Pro user opens the Filing Assistant for a filing type. It follows
--      the same pattern as ai_advisor_opened.
--
--   2. Update the INSERT RLS policy to allow authenticated browser clients
--      to insert ai_filing_opened. The server-authoritative quota events
--      (ai_question_asked, ai_response_generated, ai_response_failed) remain
--      service-role only and are intentionally excluded from the RLS allowlist.

BEGIN;

-- -------------------------------------------------------
-- 1. Expand the event_type CHECK constraint.
--    Full cumulative list — includes all previously allowed
--    types plus ai_filing_opened.
-- -------------------------------------------------------
ALTER TABLE public.usage_events
  DROP CONSTRAINT IF EXISTS usage_events_event_type_check;

ALTER TABLE public.usage_events
  ADD CONSTRAINT usage_events_event_type_check
  CHECK (event_type IN (
    -- Core product events (browser-insertable)
    'company_searched',
    'company_tracked',
    'company_removed',
    'upgrade_clicked',
    'feedback_submitted',
    'email_alerts_disabled',
    'email_alerts_enabled',
    'report_downloaded',
    -- AI Advisor: client-side analytics (browser-insertable)
    'ai_advisor_opened',
    'ai_upgrade_prompt_shown',
    'ai_upgrade_clicked',
    -- AI Filing Assistant: client-side analytics (browser-insertable)
    'ai_filing_opened',
    -- AI features: server-authoritative quota events (service-role only)
    'ai_question_asked',
    'ai_response_generated',
    'ai_response_failed'
  ));

-- -------------------------------------------------------
-- 2. Update the INSERT RLS policy to include ai_filing_opened.
--    Server-authoritative events remain excluded.
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own events" ON public.usage_events;
CREATE POLICY "Users can insert own events"
  ON public.usage_events FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND event_type IN (
      'company_searched',
      'company_tracked',
      'company_removed',
      'upgrade_clicked',
      'feedback_submitted',
      'email_alerts_disabled',
      'email_alerts_enabled',
      'report_downloaded',
      'ai_advisor_opened',
      'ai_upgrade_prompt_shown',
      'ai_upgrade_clicked',
      'ai_filing_opened'
      -- ai_question_asked, ai_response_generated, ai_response_failed
      -- are intentionally excluded: service-role only.
    )
  );

COMMIT;
