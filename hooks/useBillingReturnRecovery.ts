'use client'

import { useEffect, useRef, useState } from 'react'

import { useFamily } from '@/components/FamilyProvider'
import {
  BILLING_RETURN_TARGET_PATH,
  notifyFamilySessionRestoredIfNeeded,
  recoverFamilySessionAfterBillingRedirect,
  recoverFamilySessionFromStripeCheckout,
} from '@/lib/family/billingReturn'
import { verifyStripeCheckoutSession } from '@/lib/family/stripeBilling'
import { hasFamilySession } from '@/lib/familySession'

type UseBillingReturnRecoveryOptions = {
  /** Nach gültiger Session automatisch weiterleiten (z. B. Admin-Einstellungen). */
  redirectWhenReady?: boolean
  redirectTo?: string
  /** Stripe Checkout session_id aus der Success-URL. */
  stripeSessionId?: string | null
}

/** Stripe-Rückkehr: Session aus Cookie/sessionStorage wiederherstellen. */
export function useBillingReturnRecovery(options: UseBillingReturnRecoveryOptions = {}) {
  const {
    redirectWhenReady = false,
    redirectTo = BILLING_RETURN_TARGET_PATH,
    stripeSessionId = null,
  } = options
  const { hasSession, loading, refresh } = useFamily()
  const [bootstrapped, setBootstrapped] = useState(false)
  const [recovering, setRecovering] = useState(true)
  const recoveryStartedRef = useRef(false)

  useEffect(() => {
    if (recoveryStartedRef.current) return
    recoveryStartedRef.current = true

    let cancelled = false

    async function runRecovery() {
      let session = recoverFamilySessionAfterBillingRedirect()
      if (session) {
        notifyFamilySessionRestoredIfNeeded(session, hasSession)
        await refresh()
      } else if (stripeSessionId) {
        session = await recoverFamilySessionFromStripeCheckout(stripeSessionId, verifyStripeCheckoutSession)
        if (session) {
          notifyFamilySessionRestoredIfNeeded(session, hasSession)
          await refresh()
        }
      }

      if (!cancelled) {
        setBootstrapped(true)
        setRecovering(false)
      }
    }

    void runRecovery()

    return () => {
      cancelled = true
    }
  }, [hasSession, refresh, stripeSessionId])

  const sessionActive = hasSession || hasFamilySession()

  useEffect(() => {
    if (!redirectWhenReady || !bootstrapped || recovering || loading || !sessionActive) return
    window.location.replace(redirectTo)
  }, [redirectWhenReady, redirectTo, bootstrapped, recovering, loading, sessionActive])

  return {
    bootstrapped,
    recovering,
    hasSession: sessionActive,
    loading: loading || recovering,
    refresh,
  }
}
