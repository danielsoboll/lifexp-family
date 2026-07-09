'use client'

import { useState } from 'react'

import FamilyPlusCheckoutLegalNote from './FamilyPlusCheckoutLegalNote'
import { notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import FamilyPlusActiveWelcome from './FamilyPlusActiveWelcome'
import FamilyPlusPriceDisplay from './FamilyPlusPriceDisplay'
import { familyPlusTarifLine, isFamilyPlus } from '../lib/family/familyPlus'
import {
  FAMILY_PLUS_CTA_LABEL,
  FAMILY_PLUS_NON_ADMIN_HINT_FOOTER,
  FAMILY_PLUS_TAGLINE,
} from '../lib/family/familyPlusFeatures'
import {
  createPlusCheckoutSession,
  createPlusPortalSession,
  syncPlusBillingFromStripe,
} from '../lib/family/stripeBilling'
import { usePlusCheckout } from '../hooks/usePlusCheckout'
import type { Family } from '../lib/family/types'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'
import PlusLockHeaderButton from './PlusLockHeaderButton'

type FamilyPlusBillingControlsProps = {
  family?: Family | null
  compact?: boolean
  /** Preis-Streifen über dem CTA — aus, wenn oben schon FamilyPlusPriceDisplay steht. */
  showPriceBadge?: boolean
  /** Willkommensblock — aus, wenn er schon darüber steht (z. B. PLUS-Sheet). */
  showActiveWelcome?: boolean
  /** Nicht-Admins: goldenen PLUS-Button → Hinweis-Sheet („Frag Mama oder Papa“). */
  onDiscoverPlus?: () => void
  /** Rechtshinweis unter dem Checkout-Button — aus, wenn er schon darüber steht. */
  showLegalNote?: boolean
}

function useLocalPlusCheckout(family: Family | null | undefined, canAdmin: boolean) {
  const { refresh } = useFamily()
  const [busy, setBusy] = useState<'checkout' | 'portal' | 'sync' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const plusActive = family ? isFamilyPlus(family) : false

  const startCheckout = async () => {
    setError(null)
    if (!family) return
    if (!canAdmin) {
      setError('Nur Familien-Admins können das Abo verwalten.')
      return
    }
    setBusy('checkout')
    try {
      const { url } = await createPlusCheckoutSession(family.id)
      window.location.assign(url)
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout fehlgeschlagen.')
    } finally {
      setBusy(null)
    }
  }

  const openPortal = async () => {
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
  }

  const syncBilling = async () => {
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
  }

  return {
    plusActive,
    canStartCheckout: Boolean(family && canAdmin && !plusActive),
    busy,
    error,
    startCheckout,
    openPortal,
    syncBilling,
  }
}

export default function FamilyPlusBillingControls({
  family: familyProp,
  compact = false,
  showPriceBadge = true,
  showActiveWelcome = true,
  onDiscoverPlus,
  showLegalNote = true,
}: FamilyPlusBillingControlsProps) {
  const { family: familyFromContext, canAdmin, refresh } = useFamily()
  const family = familyProp ?? familyFromContext
  const checkoutContext = usePlusCheckout()
  const localCheckout = useLocalPlusCheckout(family, canAdmin)

  const plusActive = checkoutContext?.plusActive ?? localCheckout.plusActive
  const busy = checkoutContext?.busy ?? localCheckout.busy
  const error = checkoutContext?.error ?? localCheckout.error
  const startCheckout = checkoutContext?.startCheckout ?? localCheckout.startCheckout
  const openPortal = checkoutContext?.openPortal ?? localCheckout.openPortal
  const syncBilling = checkoutContext?.syncBilling ?? localCheckout.syncBilling

  if (!family) return null

  if (!canAdmin) {
    return (
      <div className="space-y-2">
        {!plusActive ? (
          <>
            <p className="text-sm leading-relaxed text-slate-950 dark:text-slate-300">{FAMILY_PLUS_TAGLINE}</p>
            {onDiscoverPlus ? (
              <>
                <PlusLockHeaderButton variant="cta" onClick={onDiscoverPlus}>
                  {FAMILY_PLUS_CTA_LABEL}
                </PlusLockHeaderButton>
                <p className="text-center text-sm leading-relaxed text-slate-950 dark:text-slate-400">
                  {FAMILY_PLUS_NON_ADMIN_HINT_FOOTER}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-950 dark:text-slate-400">
                PLUS ist noch nicht aktiv — ein Admin kann es in den Einstellungen aktivieren.
              </p>
            )}
          </>
        ) : showActiveWelcome ? (
          <FamilyPlusActiveWelcome compact />
        ) : null}
      </div>
    )
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {plusActive && showActiveWelcome ? <FamilyPlusActiveWelcome compact={compact} /> : null}
      {!plusActive && !compact ? (
        <p className="text-sm leading-relaxed text-slate-950 dark:text-slate-300">{FAMILY_PLUS_TAGLINE}</p>
      ) : null}
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{familyPlusTarifLine(family)}</p>

      {plusActive ? (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void openPortal()}
          className={`${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 border-slate-500/80 bg-gradient-to-b from-slate-100 to-slate-300 px-4 py-3 text-sm font-bold text-slate-900 disabled:opacity-60 dark:border-slate-500 dark:from-slate-700 dark:to-slate-900 dark:text-slate-100`}
        >
          {busy === 'portal' ? 'Wird geöffnet …' : 'Abo verwalten'}
        </button>
      ) : (
        <>
          {showPriceBadge ? <FamilyPlusPriceDisplay variant="inline" /> : null}
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void startCheckout()}
            className={`${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 border-amber-500 bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-3.5 text-base font-bold text-amber-950 shadow-[0_4px_14px_-4px_rgba(217,119,6,0.55)] ring-1 ring-amber-400/30 disabled:opacity-60 dark:ring-amber-600/40`}
          >
            {busy === 'checkout' ? 'Weiter zu Stripe …' : FAMILY_PLUS_CTA_LABEL}
          </button>
          {showLegalNote ? <FamilyPlusCheckoutLegalNote /> : null}
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void syncBilling()}
            className="w-full text-xs font-medium text-slate-900 underline underline-offset-2 disabled:opacity-60 dark:text-slate-300"
          >
            {busy === 'sync' ? 'Synchronisiere mit Stripe …' : 'Bereits bezahlt? Status von Stripe holen'}
          </button>
        </>
      )}

      {plusActive ? (
        <button
          type="button"
          disabled={busy !== null}
          className="text-xs font-medium text-slate-900 underline underline-offset-2 disabled:opacity-60 dark:text-slate-300"
          onClick={() => void syncBilling()}
        >
          {busy === 'sync' ? 'Synchronisiere …' : 'Status aktualisieren'}
        </button>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  )
}
