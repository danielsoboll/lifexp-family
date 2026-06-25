'use client'

import { useEffect, useState } from 'react'

import { useFamily } from '@/components/FamilyProvider'
import {
  BILLING_RETURN_TARGET_PATH,
  bootstrapFamilySessionAfterExternalRedirect,
  notifyFamilySessionRestoredIfNeeded,
} from '@/lib/family/billingReturn'

type UseBillingReturnRecoveryOptions = {
  /** Nach gültiger Session automatisch weiterleiten (z. B. Admin-Einstellungen). */
  redirectWhenReady?: boolean
  redirectTo?: string
}

/** Stripe-Rückkehr: Session aus Cookie wiederherstellen, nicht ins Onboarding fallen. */
export function useBillingReturnRecovery(options: UseBillingReturnRecoveryOptions = {}) {
  const { redirectWhenReady = false, redirectTo = BILLING_RETURN_TARGET_PATH } = options
  const { hasSession, loading, refresh } = useFamily()
  const [bootstrapped, setBootstrapped] = useState(false)

  useEffect(() => {
    const stored = bootstrapFamilySessionAfterExternalRedirect()
    notifyFamilySessionRestoredIfNeeded(stored, hasSession)
    setBootstrapped(true)
    void refresh()
  }, [hasSession, refresh])

  useEffect(() => {
    if (!redirectWhenReady || !bootstrapped || loading || !hasSession) return
    window.location.replace(redirectTo)
  }, [redirectWhenReady, redirectTo, bootstrapped, loading, hasSession])

  return {
    bootstrapped,
    hasSession,
    loading,
    refresh,
  }
}
