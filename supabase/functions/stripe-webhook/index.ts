import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'

import {
  resolveFamilyIdFromStripeObject,
  syncFamilyFromSubscription,
  getStripe,
} from '../_shared/billing.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'

serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!webhookSecret) {
    return jsonResponse({ error: 'STRIPE_WEBHOOK_SECRET fehlt.' }, 500)
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return jsonResponse({ error: 'Stripe-Signatur fehlt.' }, 400)
  }

  const stripe = getStripe()
  const admin = getServiceClient()
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error('stripe-webhook signature', error)
    return jsonResponse({ error: 'Ungültige Signatur.' }, 400)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const familyId = await resolveFamilyIdFromStripeObject(
          admin,
          session.metadata,
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
          typeof session.customer === 'string' ? session.customer : session.customer?.id,
        )
        if (!familyId) break

        const subscriptionId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id
        if (!subscriptionId || !customerId) break

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        await syncFamilyFromSubscription(admin, familyId, subscription, customerId)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId =
          typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

        const familyId = await resolveFamilyIdFromStripeObject(
          admin,
          subscription.metadata,
          subscription.id,
          customerId,
        )
        if (!familyId) break

        await syncFamilyFromSubscription(admin, familyId, subscription, customerId)
        break
      }

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId =
          typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        if (!subscriptionId || !customerId) break

        const familyId = await resolveFamilyIdFromStripeObject(
          admin,
          invoice.metadata,
          subscriptionId,
          customerId,
        )
        if (!familyId) break

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        await syncFamilyFromSubscription(admin, familyId, subscription, customerId)
        break
      }

      default:
        break
    }

    return jsonResponse({ received: true })
  } catch (error) {
    console.error('stripe-webhook handler', event.type, error)
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Webhook-Verarbeitung fehlgeschlagen' },
      500,
    )
  }
})
