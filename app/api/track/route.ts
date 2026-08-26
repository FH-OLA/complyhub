import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const company_number = request.nextUrl.searchParams.get('company_number')

  if (!company_number) {
    return NextResponse.json({ error: 'company_number is required' }, { status: 400 })
  }

  const { data } = await supabase
    .from('tracked_companies')
    .select('id')
    .eq('user_id', user.id)
    .eq('company_number', company_number.trim().toUpperCase())
    .maybeSingle()

  return NextResponse.json({ tracked: data !== null })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const company_number = body.company_number?.trim().toUpperCase()
  const company_name = body.company_name?.trim()

  if (!company_number || !company_name) {
    return NextResponse.json(
      { error: 'company_number and company_name are required' },
      { status: 400 }
    )
  }

  // Delegate the limit check + insert to an atomic Postgres function that
  // uses a per-user advisory lock, eliminating the race condition that existed
  // when count and insert were performed as two separate queries.
  const { data: result, error: rpcError } = await supabase.rpc('track_company', {
    p_company_number: company_number,
    p_company_name: company_name,
  })

  if (rpcError) {
    console.error(rpcError)
    return NextResponse.json({ error: 'Failed to track company' }, { status: 500 })
  }

  const outcome = result as { error?: string; success?: boolean }

  if (outcome.error === 'limit_reached') {
    return NextResponse.json(
      { error: 'Free plan limit reached. Upgrade to track more companies.' },
      { status: 403 }
    )
  }

  if (outcome.error === 'already_tracked') {
    return NextResponse.json(
      { error: 'You are already tracking this company' },
      { status: 400 }
    )
  }

  return NextResponse.json({ success: true })
}