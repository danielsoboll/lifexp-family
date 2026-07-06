'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { notifyFamilyDataChanged, useFamily } from '../components/FamilyProvider'
import { isFamilyPlus } from '../lib/family/familyPlus'
import {
  createPlusCheckoutSession,
  createPlusPortalSession,
  syncPlusBillingFromStripe,
} from '../lib/family/stripeBilling'

type PlusCheckoutBusy = 'checkout' | 'portal' | 'sync' | null

export type PlusCheckoutContextValue = {
  canStartCheckout: boolean
  plusActive: boolean
  busy: PlusCheckoutBusy
  error: string | null
  startCheckout: () => Promise<void>
  openPortal: () => Promise<void>
  syncBilling: () => Promise<void>
}

const PlusCheckoutContext = createContext<PlusCheckoutContextValue | null>(null)

export function PlusCheckoutProvider({ children }: { children: ReactNode }) {
  const { family, canAdmin, refresh } = useFamily()
  const [busy, setBusy] = useState<PlusCheckoutBusy>(null)
  const [error, setError] = useState<string | null>(null)

  const plusActive = family ? isFamilyPlus(family) : false
  const canStartCheckout = Boolean(family && canAdmin && !plusActive)

  const startCheckout = useCallback(async () => {
    setError(null)
    if (!family) return
    if (!canAdmin) {
      setError('Nur Familien-Admins können das Abo verwalten.')
      return
    }
    if (plusActive) return
    setBusy('checkout')
    try {
      const { url } = await createPlusCheckoutSession(family.id)
      window.location.assign(url)
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout fehlgeschlagen.')
    } finally {
      setBusy(null)
    }
  }, [canAdmin, family, plusActive])

  const openPortal = useCallback(async () => {
    setError(null)
    if (!family) return
    if (!canAdmin) {
      setError('Nur Familien-Admins können das Abo verwalten.')
      return
    }
    setBusy('portal')
    try {
      const { url } = await createPlusPortalSession(family.id)
      window.location.assign(url)
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : 'Portal konnte nicht geöffnet werden.')
    } finally {
      setBusy(null)
    }
  }, [canAdmin, family])

  const syncBilling = useCallback(async () => {
    setError(null)
    if (!family) return
    if (!canAdmin) {
      setError('Nur Familien-Admins können das Abo verwalten.')
      return
    }
    setBusy('sync')
    try {
      await syncPlusBillingFromStripe(family.id)
      await refresh()
      notifyFamilyDataChanged()
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Synchronisation fehlgeschlagen.')
    } finally {
      setBusy(null)
    }
  }, [canAdmin, family, refresh])

  const value = useMemo(
    (): PlusCheckoutContextValue => ({
      canStartCheckout,
      plusActive,
      busy,
      error,
      startCheckout,
      openPortal,
      syncBilling,
    }),
    [busy, canStartCheckout, error, openPortal, plusActive, startCheckout, syncBilling],
  )

  return <PlusCheckoutContext.Provider value={value}>{children}</PlusCheckoutContext.Provider>
}

export function usePlusCheckout(): PlusCheckoutContextValue | null {
  return useContext(PlusCheckoutContext)
}
