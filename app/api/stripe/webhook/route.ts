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
  let eventClaimed = false
  const { error: idempotencyError } = await supabase
    .from('stripe_webhook_events')
    .insert({ event_id: event.id })

  if (idempotencyError) {
    if (idempotencyError.code === '23505') {
      return NextResponse.json({ received: true })
    }
    console.error('[webhook] idempotency gate failed — skipping business mutation:', {
      eventId: event.id,
      eventType: event.type,
      error: idempotencyError.message,
      code: idempotencyError.code,
    })
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    )
  } else {
    eventClaimed = true
  }

  let mutationFailed = false

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
      const { error: upsertError } = await supabase.from('user_subscriptions').upsert(
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
      if (upsertError) {
        console.error('[webhook] checkout.session.completed upsert failed:', {
          eventId: event.id,
          subscriptionId,
          error: upsertError.message,
          code: upsertError.code,
        })
        mutationFailed = true
      }
    } else {
      // Missing metadata.user_id — the Stripe event itself lacks association
      // data. Retrying cannot repair this; the metadata is baked into the event.
      // Log for manual investigation but do NOT mark as retryable.
      console.error('[webhook] checkout.session.completed missing metadata.user_id:', {
        eventId: event.id,
        hasCustomer: !!customerId,
        hasSubscription: !!subscriptionId,
      })
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription

    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: subscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)

    if (updateError) {
      console.error('[webhook] customer.subscription.updated write failed:', {
        eventId: event.id,
        subscriptionId: subscription.id,
        error: updateError.message,
        code: updateError.code,
      })
      mutationFailed = true
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription

    const { error: deleteError } = await supabase
      .from('user_subscriptions')
      .update({
        plan: 'free',
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)

    if (deleteError) {
      console.error('[webhook] customer.subscription.deleted write failed:', {
        eventId: event.id,
        subscriptionId: subscription.id,
        error: deleteError.message,
        code: deleteError.code,
      })
      mutationFailed = true
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const raw = invoice.parent?.subscription_details?.subscription
    const subscriptionId = typeof raw === 'string' ? raw : raw?.id

    if (subscriptionId) {
      const { error: failedError } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId)

      if (failedError) {
        console.error('[webhook] invoice.payment_failed write failed:', {
          eventId: event.id,
          subscriptionId,
          error: failedError.message,
          code: failedError.code,
        })
        mutationFailed = true
      }
    }
  }

  // If a required business-state mutation failed: release the idempotency claim
  // so Stripe can retry. All mutations (upsert on user_id, update by
  // stripe_subscription_id) are inherently idempotent, making retries safe.
  if (mutationFailed) {
    if (eventClaimed) {
      const { error: cleanupError } = await supabase
        .from('stripe_webhook_events')
        .delete()
        .eq('event_id', event.id)

      if (cleanupError) {
        console.error('[webhook] CRITICAL: failed to release idempotency claim:', {
          eventId: event.id,
          error: cleanupError.message,
          code: cleanupError.code,
        })
      }
    }
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    )
  }

  return NextResponse.json({ received: true })
}