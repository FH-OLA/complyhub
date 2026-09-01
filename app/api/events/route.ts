import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_EVENT_TYPES = new Set([
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
  'ai_filing_opened',
])

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const event_type = body.event_type
  const properties = body.properties && typeof body.properties === 'object' ? body.properties : {}

  if (typeof event_type !== 'string' || !VALID_EVENT_TYPES.has(event_type)) {
    return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 })
  }

  const { error } = await supabase.from('usage_events').insert({
    user_id: user.id,
    event_type,
    properties,
  })

  if (error) {
    // Events are non-critical — log but return success to avoid client retries
    console.error('Event insert error:', error)
  }

  return NextResponse.json({ success: true })
}
