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

  const { count, error: countError } = await supabase
    .from('tracked_companies')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (countError) {
    console.error(countError)
    return NextResponse.json(
      { error: 'Could not verify tracking limit' },
      { status: 500 }
    )
  }

  if ((count || 0) >= 1) {
    return NextResponse.json(
      { error: 'Free plan limit reached. Upgrade to track more companies.' },
      { status: 403 }
    )
  }

  const { error } = await supabase.from('tracked_companies').insert({
    user_id: user.id,
    company_number,
    company_name,
  })

  if (error) {
    console.error(error)

    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'You are already tracking this company' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to track company' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}