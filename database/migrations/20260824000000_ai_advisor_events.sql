-- Sprint 7: AI Compliance Advisor
-- Apply AFTER 20260821000000_report_download_event.sql
--
-- Two operations:
--   1. Expand usage_events_event_type_check to include all six new AI event types.
--   2. Restrict the usage_events INSERT RLS policy so authenticated browser clients
--      can only insert approved client-side event types.
--      The three server-authoritative AI event types (ai_question_asked,
--      ai_response_generated, ai_response_failed) may only be inserted by the
--      service-role client, which bypasses RLS entirely. This prevents browser
--      clients from manufacturing or manipulating quota-bearing events.

BEGIN;

-- -------------------------------------------------------
-- 1. Expand the event_type CHECK constraint.
--    Includes all 8 previously allowed types plus the
--    6 new AI Advisor event types.
-- -------------------------------------------------------
ALTER TABLE public.usage_events
  DROP CONSTRAINT IF EXISTS usage_events_event_type_check;

ALTER TABLE public.usage_events
  ADD CONSTRAINT usage_events_event_type_check
  CHECK (event_type IN (
    -- Previously allowed (do not remove)
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
    -- AI Advisor: server-authoritative (service-role only)
    'ai_question_asked',
    'ai_response_generated',
    'ai_response_failed'
  ));

-- -------------------------------------------------------
-- 2. Restrict the INSERT RLS policy.
--    The previous policy (from 20260817000000_beta_operations.sql)
--    allowed any authenticated user to insert any event_type for
--    themselves. The new policy adds an event_type allowlist to
--    WITH CHECK, restricting browser clients to the approved
--    client-side subset only.
--
--    Reads continue to be performed exclusively via the service-role
--    client in the admin dashboard — no SELECT policy is added.
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
      'ai_upgrade_clicked'
      -- ai_question_asked, ai_response_generated, ai_response_failed
      -- are intentionally excluded: service-role only.
    )
  );

COMMIT;
