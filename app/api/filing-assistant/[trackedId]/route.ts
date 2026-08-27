import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchCompany } from '@/lib/companies-house/client'
import { calculateCompliance } from '@/lib/compliance'
import { buildReportData } from '@/lib/report'
import { buildFilingContext, buildFilingSystemPrompt } from '@/lib/ai/filing-assistant'
import { FILING_GUIDANCE, SUPPORTED_FILING_TYPES, type FilingType } from '@/lib/filing-guidance'

// ---------------------------------------------------------------------------
// Configuration — shared with the AI Advisor (same quota pool and limits)
// ---------------------------------------------------------------------------

const AI_MONTHLY_LIMITS: Record<string, number> = {
  free: 0,
  pro:  parseInt(process.env.AI_MONTHLY_LIMIT_PRO ?? '100', 10),
}

const AI_BURST_LIMIT     = parseInt(process.env.AI_BURST_LIMIT_PER_MINUTE ?? '5', 10)
const AI_REQUEST_TIMEOUT = 15_000

// ---------------------------------------------------------------------------
// POST /api/filing-assistant/[trackedId]
//
// Gate order:
//   1.  Auth (getUser)
//   2.  Company ownership check (atomic, IDOR-safe)
//   3.  Active Pro subscription check
//   4.  Validate filingType
//   5.  Resolve curated filing guidance
//   6.  Burst rate check  (admin client, 60 s)
//   7.  Monthly quota check (admin client, UTC)
//   8.  Fetch live Companies House data
//   9.  Dissolved company check             ← 422 if dissolved
//   10. Build context + system prompt
//   11. AWAIT ai_question_asked insert      ← aborts on write failure
//   12. Call AI provider (15 s timeout)
//   13. AWAIT outcome event insert
//   14. Return response
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
  // 2. Company ownership check (IDOR-safe)
  // -------------------------------------------------------------------------
  const { data: tracked, error: trackError } = await supabase
    .from('tracked_companies')
    .select('id, company_number, company_name')
    .eq('id', trackedId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (trackError) {
    console.error('[filing-assistant] DB error fetching tracked company:', trackError)
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
    console.error('[filing-assistant] DB error fetching subscription:', subError)
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
  // 4. Validate filingType
  // -------------------------------------------------------------------------
  let body: { filingType?: unknown } | null = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const filingType = body?.filingType
  if (
    typeof filingType !== 'string' ||
    !(SUPPORTED_FILING_TYPES as readonly string[]).includes(filingType)
  ) {
    return NextResponse.json(
      {
        error: `filingType must be one of: ${SUPPORTED_FILING_TYPES.join(', ')}.`,
      },
      { status: 400 },
    )
  }

  // -------------------------------------------------------------------------
  // 5. Resolve curated filing guidance (always succeeds after step 4)
  // -------------------------------------------------------------------------
  const guidance = FILING_GUIDANCE[filingType as FilingType]

  // -------------------------------------------------------------------------
  // All quota checks use the admin/service-role client.
  // -------------------------------------------------------------------------
  const adminClient = createAdminClient()

  // -------------------------------------------------------------------------
  // 6. Burst rate check (rolling 60-second window)
  // -------------------------------------------------------------------------
  const sixtySecondsAgo = new Date(Date.now() - 60_000)

  const { count: burstCount, error: burstError } = await adminClient
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('event_type', 'ai_question_asked')
    .gte('created_at', sixtySecondsAgo.toISOString())

  if (burstError) {
    console.error('[filing-assistant] Failed to count burst ai_question_asked:', burstError)
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
  // 7. Monthly quota check (calendar month, UTC)
  // -------------------------------------------------------------------------
  const now          = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const plan         = subscription.plan
  const monthlyLimit = AI_MONTHLY_LIMITS[plan] ?? 0

  const { count: monthlyCount, error: countError } = await adminClient
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('event_type', 'ai_question_asked')
    .gte('created_at', startOfMonth.toISOString())

  if (countError) {
    console.error('[filing-assistant] Failed to count monthly ai_question_asked:', countError)
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
  // 8. Fetch live Companies House data
  // -------------------------------------------------------------------------
  let liveData: Awaited<ReturnType<typeof fetchCompany>>
  try {
    liveData = await fetchCompany(tracked.company_number)
  } catch (err) {
    console.error('[filing-assistant] Companies House fetch failed:', err)
    return NextResponse.json(
      { error: 'Could not process request. Please try again.' },
      { status: 503 },
    )
  }

  // -------------------------------------------------------------------------
  // 9. Dissolved company check
  // Dissolved companies have no filing obligations. The UI hides the Filing
  // Assistant for dissolved companies; this check enforces the same constraint
  // at the API level against direct requests.
  // -------------------------------------------------------------------------
  if (liveData.company_status === 'dissolved') {
    return NextResponse.json(
      { error: 'No filings are required for a dissolved company.' },
      { status: 422 },
    )
  }

  // -------------------------------------------------------------------------
  // 10. Build context + system prompt
  // -------------------------------------------------------------------------
  const compliance   = calculateCompliance(liveData)
  const reportData   = buildReportData(tracked, liveData, compliance)
  const context      = buildFilingContext(reportData, filingType as FilingType)
  const systemPrompt = buildFilingSystemPrompt(context, guidance)

  // -------------------------------------------------------------------------
  // 11. Persist ai_question_asked (authoritative quota event)
  // MUST succeed before the AI provider is called.
  // -------------------------------------------------------------------------
  const { error: questionInsertError } = await adminClient
    .from('usage_events')
    .insert({ user_id: user.id, event_type: 'ai_question_asked', properties: {} })

  if (questionInsertError) {
    console.error('[filing-assistant] Failed to record ai_question_asked:', questionInsertError)
    return NextResponse.json(
      { error: 'Could not process request. Please try again.' },
      { status: 500 },
    )
  }

  // -------------------------------------------------------------------------
  // 12. Call AI provider with a 15-second timeout
  // -------------------------------------------------------------------------
  const model     = process.env.AI_MODEL ?? 'claude-haiku-4-5-20251001'
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let guide:         string | null = null
  let providerFailed = false
  let timedOut       = false

  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT)

  try {
    const message = await anthropic.messages.create(
      {
        model,
        max_tokens: 1000,
        system:     systemPrompt,
        messages:   [
          {
            role:    'user',
            content: `Please generate a filing preparation guide for ${guidance.displayName}.`,
          },
        ],
      },
      { signal: controller.signal },
    )
    clearTimeout(timeoutId)

    const block = message.content[0]
    guide = block.type === 'text' ? block.text : null
    if (!guide) providerFailed = true
  } catch (err) {
    clearTimeout(timeoutId)
    if (controller.signal.aborted) {
      timedOut = true
      console.error('[filing-assistant] AI request timed out after 15 s')
    } else {
      console.error('[filing-assistant] AI provider call failed:', err)
    }
    providerFailed = true
  }

  // -------------------------------------------------------------------------
  // 13. Persist outcome event (non-fatal)
  // -------------------------------------------------------------------------
  const outcomeType = providerFailed ? 'ai_response_failed' : 'ai_response_generated'
  const { error: outcomeError } = await adminClient
    .from('usage_events')
    .insert({ user_id: user.id, event_type: outcomeType, properties: {} })

  if (outcomeError) {
    console.error(`[filing-assistant] Failed to record ${outcomeType}:`, outcomeError)
  }

  // -------------------------------------------------------------------------
  // 14. Return response
  // -------------------------------------------------------------------------
  if (timedOut) {
    return NextResponse.json(
      { error: 'The AI Filing Assistant is temporarily unavailable. Please try again.' },
      { status: 503 },
    )
  }

  if (providerFailed) {
    return NextResponse.json(
      { error: 'Could not generate a guide. Please try again.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ guide })
}
