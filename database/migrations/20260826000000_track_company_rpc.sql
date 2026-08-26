-- Sprint 8.5: Atomic track_company function
--
-- Eliminates the free-tier tracking race condition that existed when the
-- application performed a SELECT COUNT(*) + INSERT as two separate queries.
-- Concurrent requests from the same user could both read count=0 and both
-- insert, bypassing the free plan limit.
--
-- This function serializes concurrent calls per user via a transaction-level
-- advisory lock (pg_advisory_xact_lock), then atomically checks the limit
-- and inserts. The API route (app/api/track/route.ts) now calls this RPC
-- instead of the manual count+insert pattern.
--
-- SECURITY DEFINER: runs with owner privileges so it can read
-- user_subscriptions and write tracked_companies regardless of the caller's
-- RLS context. auth.uid() still returns the JWT-authenticated user's ID,
-- keeping the operation scoped to the calling user.

BEGIN;

CREATE OR REPLACE FUNCTION public.track_company(
  p_company_number text,
  p_company_name   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid    := auth.uid();
  v_is_pro  boolean;
  v_count   integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  -- Serialize concurrent calls for the same user to prevent race conditions
  -- on the free-tier limit check. hashtext() returns int4; cast to bigint
  -- for the single-argument form of pg_advisory_xact_lock.
  -- The lock is automatically released when the transaction ends.
  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text)::bigint);

  -- Determine Pro status. No subscription row → free plan.
  SELECT (plan = 'pro' AND status = 'active')
  INTO   v_is_pro
  FROM   public.user_subscriptions
  WHERE  user_id = v_user_id;

  v_is_pro := COALESCE(v_is_pro, false);

  -- Count existing tracked companies for this user.
  SELECT COUNT(*) INTO v_count
  FROM   public.tracked_companies
  WHERE  user_id = v_user_id;

  IF NOT v_is_pro AND v_count >= 1 THEN
    RETURN jsonb_build_object('error', 'limit_reached');
  END IF;

  INSERT INTO public.tracked_companies (user_id, company_number, company_name)
  VALUES (v_user_id, p_company_number, p_company_name);

  RETURN jsonb_build_object('success', true);

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('error', 'already_tracked');
END;
$$;

-- Restrict execution to authenticated users only.
-- The service-role client bypasses this grant and can call the function directly.
REVOKE ALL ON FUNCTION public.track_company(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_company(text, text) TO authenticated;

COMMIT;
