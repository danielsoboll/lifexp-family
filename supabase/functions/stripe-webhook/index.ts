import Stripe from 'https://esm.sh/stripe@14.25.0?target=denonext'

import {
  ensureFullStripeSubscription,
  getStripe,
  resolveFamilyIdFromStripeObject,
  stripeCryptoProvider,
  syncFamilyFromCheckoutSession,
  syncFamilyFromSubscription,
} from '../_shared/billing.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!webhookSecret) {
    return jsonResponse({ error: 'STRIPE_WEBHOOK_SECRET fehlt.' }, 500)
  }

  const signature = req.headers.get('stripe-signature') ?? req.headers.get('Stripe-Signature')
  if (!signature) {
    return jsonResponse({ error: 'Stripe-Signatur fehlt.' }, 400)
  }

  // Raw body — niemals req.json() vor der Signaturprüfung (Stripe HMAC braucht exakte Bytes).
  const body = await req.text()

  const stripe = getStripe()
  const admin = getServiceClient()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      stripeCryptoProvider,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ungültige Signatur.'
    console.error('stripe-webhook signature', message)
    return jsonResponse({ error: message }, 400)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break
        await syncFamilyFromCheckoutSession(admin, session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        let subscription = event.data.object as Stripe.Subscription
        subscription = await ensureFullStripeSubscription(stripe, subscription)

        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id
        if (!customerId) break

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

        let subscription = await stripe.subscriptions.retrieve(subscriptionId)
        subscription = await ensureFullStripeSubscription(stripe, subscription)
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
