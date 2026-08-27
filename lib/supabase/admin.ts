import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Module-level singleton — one service-role client per process lifetime.
// In serverless (Vercel), warm invocations reuse the same module instance;
// cold starts create a fresh client. Either way, at most one client exists
// per isolate, which avoids redundant connection overhead within a request.
let _client: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _client
}
