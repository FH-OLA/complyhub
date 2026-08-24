-- Sprint 6B: Add report_downloaded to usage_events event_type allowlist
-- Apply AFTER 20260819000001_email_preferences.sql

BEGIN;

-- Expand the CHECK constraint to include the report_downloaded event.
-- Drop-and-recreate is the only portable way to modify a CHECK constraint
-- in PostgreSQL — ALTER CONSTRAINT only works for FK deferral attributes.
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
    'email_alerts_enabled',
    'report_downloaded'
  ));

COMMIT;
