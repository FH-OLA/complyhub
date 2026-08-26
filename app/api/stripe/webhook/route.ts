import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing webhook secret' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (error) {
    console.error('Stripe webhook verification failed:', error)
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Guard against duplicate delivery. Stripe guarantees at-least-once delivery,
  // so the same event can arrive more than once. Inserting the event ID before
  // processing uses the PRIMARY KEY constraint as an atomic idempotency gate:
  // the second delivery will hit a unique_violation (code 23505) and return 200
  // without re-processing.
  const { error: idempotencyError } = await supabase
    .from('stripe_webhook_events')
    .insert({ event_id: event.id })

  if (idempotencyError) {
    if (idempotencyError.code === '23505') {
      // Already processed — acknowledge without re-processing.
      return NextResponse.json({ received: true })
    }
    // Log unexpected DB errors but continue rather than causing Stripe to retry
    // indefinitely, since the event processing below is itself idempotent.
    console.error('Failed to record webhook event ID:', idempotencyError)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const userId = session.metadata?.user_id
    const customerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id

    if (userId) {
      await supabase.from('user_subscriptions').upsert(
        {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan: 'pro',
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription

    await supabase
      .from('user_subscriptions')
      .update({
        status: subscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription

    await supabase
      .from('user_subscriptions')
      .update({
        plan: 'free',
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const raw = invoice.parent?.subscription_details?.subscription
    const subscriptionId = typeof raw === 'string' ? raw : raw?.id

    if (subscriptionId) {
      await supabase
        .from('user_subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId)
    }
  }

  return NextResponse.json({ received: true })
}