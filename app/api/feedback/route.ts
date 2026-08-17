import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const rating = typeof body.rating === 'number' ? body.rating : null
  const page = typeof body.page === 'string' ? body.page.trim() : null

  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: 'message must be 2000 characters or fewer' }, { status: 400 })
  }

  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return NextResponse.json({ error: 'rating must be an integer between 1 and 5' }, { status: 400 })
  }

  const { error } = await supabase.from('beta_feedback').insert({
    user_id: user.id,
    user_email: user.email,
    message,
    rating,
    page,
  })

  if (error) {
    console.error('Feedback insert error:', error)
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
