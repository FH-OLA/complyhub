import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchCompany } from '@/lib/companies-house/client'
import { calculateCompliance } from '@/lib/compliance'
import { buildReportData } from '@/lib/report'
import { buildAdvisorContext, buildSystemPrompt } from '@/lib/ai/advisor'

// ---------------------------------------------------------------------------
// Configuration
// All limits are configurable via environment variables — no code change
// needed to adjust for different plans or operational conditions.
// ---------------------------------------------------------------------------

/** Maximum ai_question_asked events per calendar month (UTC) per plan. */
const AI_MONTHLY_LIMITS: Record<string, number> = {
  free: 0, // enforced by the subscription gate; this check is never reached
  pro: parseInt(process.env.AI_MONTHLY_LIMIT_PRO ?? '100', 10),
  // future:
  // business:   parseInt(process.env.AI_MONTHLY_LIMIT_BUSINESS   ?? '500',      10),
  // accountant: parseInt(process.env.AI_MONTHLY_LIMIT_ACCOUNTANT ?? '999999999', 10),
}

/** Maximum ai_question_asked events in a rolling 60-second window per user. */
const AI_BURST_LIMIT = parseInt(process.env.AI_BURST_LIMIT_PER_MINUTE ?? '5', 10)

/** Milliseconds before the Anthropic API call is aborted. */
const AI_REQUEST_TIMEOUT_MS = 15_000

// ---------------------------------------------------------------------------
// POST /api/advisor/[trackedId]
//
// Gate order:
//   1.  Auth (getUser)
//   2.  Company ownership check (atomic, IDOR-safe)
//   3.  Active Pro subscription check
//   4.  Validate and sanitise question          ← returns 400 before any quota work
//   5.  Burst rate check  (admin client, 60 s)  ← returns 429 if ≥ AI_BURST_LIMIT
//   6.  Monthly quota check (admin client, UTC) ← returns 429 if ≥ monthly limit
//   7.  Fetch live Companies House data
//   8.  Build minimal AI context
//   9.  AWAIT ai_question_asked insert          ← aborts on write failure
//   10. Call AI provider (15 s timeout)
//   11. AWAIT outcome event insert
//   12. Return response
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trackedId: string }> },
) {
  const { trackedId } = await params

  // -------------------------------------------------------------------------
  // 1. Auth
  // -------------------------------------------------------------------------
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // -------------------------------------------------------------------------
  // 2. Company ownership check
  // Atomic IDOR-safe query: same 403 for "not found" and "wrong owner"
  // to prevent enumeration.
  // -------------------------------------------------------------------------
  const { data: tracked, error: trackError } = await supabase
    .from('tracked_companies')
    .select('id, company_number, company_name')
    .eq('id', trackedId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (trackError) {
    console.error('[advisor] DB error fetching tracked company:', trackError)
    return NextResponse.json(
      { error: 'Could not process request. Please try again.' },
      { status: 500 },
    )
  }

  if (!tracked) {
    return NextResponse.json({ error: 'Not found.' }, { status: 403 })
  }

  // -------------------------------------------------------------------------
  // 3. Active Pro subscription check
  // -------------------------------------------------------------------------
  const { data: subscription, error: subError } = await supabase
    .from('user_subscriptions')
    .select('plan, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (subError) {
    console.error('[advisor] DB error fetching subscription:', subError)
    return NextResponse.json(
      { error: 'Could not process request. Please try again.' },
      { status: 500 },
    )
  }

  const isPro = subscription?.plan === 'pro' && subscription?.status === 'active'
  if (!isPro) {
    return NextResponse.json({ error: 'Pro subscription required.' }, { status: 403 })
  }

  // -------------------------------------------------------------------------
  // 4. Validate and sanitise question
  // Performed before any quota or database work — blank/invalid questions
  // return 400 immediately without consuming quota.
  // -------------------------------------------------------------------------
  let body: { question?: unknown } | null = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const rawQuestion = typeof body?.question === 'string' ? body.question.trim() : ''
  if (!rawQuestion) {
    return NextResponse.json({ error: 'Question is required.' }, { status: 400 })
  }
  const question = rawQuestion.slice(0, 500)

  // -------------------------------------------------------------------------
  // All quota checks use the admin/service-role client so counts cannot be
  // influenced by RLS or by events the browser client has inserted.
  // -------------------------------------------------------------------------
  const adminClient = createAdminClient()

  // -------------------------------------------------------------------------
  // 5. Burst rate check (rolling 60-second window)
  // Protects against rapid repeated requests within a short period.
  // Checked before the monthly quota to avoid unnecessary work.
  // -------------------------------------------------------------------------
  const sixtySecondsAgo = new Date(Date.now() - 60_000)

  const { count: burstCount, error: burstError } = await adminClient
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('event_type', 'ai_question_asked')
    .gte('created_at', sixtySecondsAgo.toISOString())

  if (burstError) {
    console.error('[advisor] Failed to count burst ai_question_asked:', burstError)
    return NextResponse.json(
      { error: 'Could not process request. Please try again.' },
      { status: 500 },
    )
  }

  if ((burstCount ?? 0) >= AI_BURST_LIMIT) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 },
    )
  }

  // -------------------------------------------------------------------------
  // 6. Monthly quota check (calendar month, UTC)
  // The race condition where two simultaneous requests both pass this check
  // is an accepted beta limitation.
  // -------------------------------------------------------------------------
  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const plan = subscription.plan
  const monthlyLimit = AI_MONTHLY_LIMITS[plan] ?? 0

  const { count: monthlyCount, error: countError } = await adminClient
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('event_type', 'ai_question_asked')
    .gte('created_at', startOfMonth.toISOString())

  if (countError) {
    console.error('[advisor] Failed to count monthly ai_question_asked:', countError)
    return NextResponse.json(
      { error: 'Could not process request. Please try again.' },
      { status: 500 },
    )
  }

  if ((monthlyCount ?? 0) >= monthlyLimit) {
    return NextResponse.json(
      {
        error:
          'Monthly AI question limit reached. Limit resets at the start of next month.',
      },
      { status: 429 },
    )
  }

  // -------------------------------------------------------------------------
  // 7. Fetch live Companies House data
  // -------------------------------------------------------------------------
  let liveData: Awaited<ReturnType<typeof fetchCompany>>
  try {
    liveData = await fetchCompany(tracked.company_number)
  } catch (err) {
    console.error('[advisor] Companies House fetch failed:', err)
    return NextResponse.json(
      { error: 'Could not process request. Please try again.' },
      { status: 503 },
    )
  }

  // -------------------------------------------------------------------------
  // 8. Build minimal AI context
  // -------------------------------------------------------------------------
  const compliance   = calculateCompliance(liveData)
  const reportData   = buildReportData(tracked, liveData, compliance)
  const context      = buildAdvisorContext(reportData)
  const systemPrompt = buildSystemPrompt(context)

  // -------------------------------------------------------------------------
  // 9. Persist ai_question_asked (authoritative quota event)
  // MUST be awaited and succeed before the AI provider is called.
  // If the write fails the request aborts — the AI is never called.
  // -------------------------------------------------------------------------
  const { error: questionInsertError } = await adminClient
    .from('usage_events')
    .insert({ user_id: user.id, event_type: 'ai_question_asked', properties: {} })

  if (questionInsertError) {
    console.error('[advisor] Failed to record ai_question_asked:', questionInsertError)
    return NextResponse.json(
      { error: 'Could not process request. Please try again.' },
      { status: 500 },
    )
  }

  // -------------------------------------------------------------------------
  // 10. Call AI provider with a 15-second timeout
  //
  // Model is read from AI_MODEL env var — switching models or providers
  // requires only a configuration change (this route is the sole Anthropic
  // import in the codebase).
  //
  // AbortController is used so the in-flight HTTP request is cancelled when
  // the timeout fires, avoiding unnecessary provider charges on hung calls.
  // -------------------------------------------------------------------------
  const model      = process.env.AI_MODEL ?? 'claude-haiku-4-5-20251001'
  const anthropic  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let answer:        string | null = null
  let providerFailed = false
  let timedOut       = false

  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS)

  try {
    const message = await anthropic.messages.create(
      {
        model,
        max_tokens: 600,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: question }],
      },
      { signal: controller.signal },
    )
    clearTimeout(timeoutId)

    const block = message.content[0]
    answer = block.type === 'text' ? block.text : null
    if (!answer) providerFailed = true
  } catch (err) {
    clearTimeout(timeoutId)
    if (controller.signal.aborted) {
      timedOut = true
      console.error('[advisor] AI request timed out after 15 s')
    } else {
      console.error('[advisor] AI provider call failed:', err)
    }
    providerFailed = true
  }

  // -------------------------------------------------------------------------
  // 11. Persist outcome event (awaited for analytics reliability in serverless)
  // A write failure is logged but does not replace a successful AI response
  // with an error.
  // -------------------------------------------------------------------------
  const outcomeType = providerFailed ? 'ai_response_failed' : 'ai_response_generated'
  const { error: outcomeError } = await adminClient
    .from('usage_events')
    .insert({ user_id: user.id, event_type: outcomeType, properties: {} })

  if (outcomeError) {
    console.error(`[advisor] Failed to record ${outcomeType}:`, outcomeError)
  }

  // -------------------------------------------------------------------------
  // 12. Return response
  // Timeout and generic provider failures return distinct status codes and
  // friendly messages; no internal errors or stack traces are exposed.
  // -------------------------------------------------------------------------
  if (timedOut) {
    return NextResponse.json(
      {
        error:
          'The AI Compliance Advisor is temporarily unavailable. Please try again.',
      },
      { status: 503 },
    )
  }

  if (providerFailed) {
    return NextResponse.json(
      { error: 'Could not generate a response. Please try again.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ answer })
}
