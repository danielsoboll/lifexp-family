'use client'

import { useEffect, useRef, useState } from 'react'

import { useFamily } from '@/components/FamilyProvider'
import {
  BILLING_RETURN_TARGET_PATH,
  notifyFamilySessionRestoredIfNeeded,
  recoverFamilySessionAfterBillingRedirect,
  recoverFamilySessionFromStripeCheckout,
  type VerifiedCheckoutSession,
} from '@/lib/family/billingReturn'
import { isFamilyPlus } from '@/lib/family/familyPlus'
import { verifyStripeCheckoutSession } from '@/lib/family/stripeBilling'
import { hasFamilySession } from '@/lib/familySession'

export type CheckoutVerificationStatus =
  | 'pending'
  | 'missing_session'
  | 'unpaid'
  | 'paid'
  | 'error'

type UseBillingReturnRecoveryOptions = {
  /** Nach gültiger Session automatisch weiterleiten (z. B. Admin-Einstellungen). */
  redirectWhenReady?: boolean
  redirectTo?: string
  /** Stripe Checkout session_id aus der Success-URL. */
  stripeSessionId?: string | null
  /** Success-URL: Zahlung bei Stripe prüfen, bevor Erfolg angezeigt wird. */
  verifyCheckout?: boolean
}

function isPaidCheckoutSession(verified: VerifiedCheckoutSession): boolean {
  return (
    verified.status === 'complete' &&
    (verified.payment_status === 'paid' || verified.payment_status === 'no_payment_required')
  )
}

/** Stripe-Rückkehr: Session wiederherstellen; auf Success-URL Checkout verifizieren. */
export function useBillingReturnRecovery(options: UseBillingReturnRecoveryOptions = {}) {
  const {
    redirectWhenReady = false,
    redirectTo = BILLING_RETURN_TARGET_PATH,
    stripeSessionId = null,
    verifyCheckout = false,
  } = options
  const { family, hasSession, loading, refresh } = useFamily()
  const [bootstrapped, setBootstrapped] = useState(false)
  const [recovering, setRecovering] = useState(true)
  const [checkoutVerification, setCheckoutVerification] = useState<CheckoutVerificationStatus>(
    verifyCheckout ? 'pending' : 'pending',
  )
  const [plusSyncedFromStripe, setPlusSyncedFromStripe] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const recoveryStartedRef = useRef(false)

  useEffect(() => {
    if (recoveryStartedRef.current) return
    recoveryStartedRef.current = true

    let cancelled = false

    async function runRecovery() {
      try {
        if (verifyCheckout) {
          if (!stripeSessionId?.trim()) {
            await recoverSessionFromBillingSnapshot()
            if (!cancelled) {
              setCheckoutVerification('missing_session')
              setVerificationError('Keine Checkout-Sitzung in der URL.')
            }
            return
          }

          let verified: VerifiedCheckoutSession
          try {
            verified = await verifyStripeCheckoutSession(stripeSessionId.trim())
          } catch (error) {
            await recoverSessionFromBillingSnapshot()
            const message = error instanceof Error ? error.message : 'Checkout konnte nicht geprüft werden.'
            if (!cancelled) {
              setCheckoutVerification(message.toLowerCase().includes('zahlung') ? 'unpaid' : 'error')
              setVerificationError(message)
            }
            return
          }

          if (!isPaidCheckoutSession(verified)) {
            await recoverSessionFromBillingSnapshot()
            if (!cancelled) {
              setCheckoutVerification('unpaid')
              setVerificationError('Stripe meldet: Zahlung nicht abgeschlossen.')
            }
            return
          }

          if (!cancelled) {
            setCheckoutVerification('paid')
            setPlusSyncedFromStripe(verified.plus_synced === true)
          }

          const session = await recoverFamilySessionFromStripeCheckout(
            stripeSessionId.trim(),
            verifyStripeCheckoutSession,
          )
          if (session) {
            notifyFamilySessionRestoredIfNeeded(session, hasSession)
            await refresh()
          } else {
            await recoverSessionFromBillingSnapshot()
          }
          return
        }

        await recoverSessionFromBillingSnapshot()
      } finally {
        if (!cancelled) {
          setBootstrapped(true)
          setRecovering(false)
        }
      }
    }

    async function recoverSessionFromBillingSnapshot() {
      const session = recoverFamilySessionAfterBillingRedirect()
      if (session) {
        notifyFamilySessionRestoredIfNeeded(session, hasSession)
        await refresh()
      }
    }

    void runRecovery()

    return () => {
      cancelled = true
    }
  }, [hasSession, refresh, stripeSessionId, verifyCheckout])

  const sessionActive = hasSession || hasFamilySession()
  const plusActive = isFamilyPlus(family)

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
    checkoutVerification: verifyCheckout ? checkoutVerification : null,
    plusSyncedFromStripe,
    verificationError,
    plusActive,
  }
}
