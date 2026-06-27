'use client'

import { useState } from 'react'

import { useFamily } from './FamilyProvider'
import { familyPlusTarifLine, isFamilyPlus } from '../lib/family/familyPlus'
import { FAMILY_PLUS_CTA_LABEL, FAMILY_PLUS_TAGLINE } from '../lib/family/familyPlusFeatures'
import { createPlusCheckoutSession, createPlusPortalSession } from '../lib/family/stripeBilling'
import type { Family } from '../lib/family/types'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type FamilyPlusBillingControlsProps = {
  family?: Family | null
  compact?: boolean
}

export default function FamilyPlusBillingControls({ family: familyProp, compact = false }: FamilyPlusBillingControlsProps) {
  const { family: familyFromContext, canAdmin, refresh } = useFamily()
  const family = familyProp ?? familyFromContext
  const [busy, setBusy] = useState<'checkout' | 'portal' | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!family) return null

  const plusActive = isFamilyPlus(family)

  const startCheckout = async () => {
    setError(null)
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

  if (!canAdmin) {
    return (
      <div className="space-y-2">
        {!plusActive ? (
          <p className="text-sm leading-relaxed text-slate-950 dark:text-slate-300">{FAMILY_PLUS_TAGLINE}</p>
        ) : null}
        <p className="text-sm text-slate-950 dark:text-slate-400">
          {plusActive
            ? 'LifeXP Family PLUS ist für eure Familie aktiv.'
            : 'PLUS ist noch nicht aktiv — ein Admin kann es in den Einstellungen aktivieren.'}
        </p>
      </div>
    )
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
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
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void startCheckout()}
          className={`${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 border-amber-500 bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-3 text-sm font-bold text-amber-950 disabled:opacity-60`}
        >
          {busy === 'checkout' ? 'Weiter zu Stripe …' : FAMILY_PLUS_CTA_LABEL}
        </button>
      )}

      {!plusActive ? (
        <p className="text-center text-xs text-slate-700 dark:text-slate-400">4,99 €/Monat</p>
      ) : null}

      {plusActive ? (
        <button
          type="button"
          className="text-xs font-medium text-slate-700 underline underline-offset-2 dark:text-slate-300"
          onClick={() => void refresh()}
        >
          Status aktualisieren
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
