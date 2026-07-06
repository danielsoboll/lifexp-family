'use client'

import { FAMILY_PLUS_ABO_SLOGAN, FAMILY_PLUS_CANCEL_NOTE } from '../lib/family/familyPlusFeatures'
import FamilyPlusPriceDisplay from './FamilyPlusPriceDisplay'
import { usePlusCheckout } from '../hooks/usePlusCheckout'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type FamilyPlusAboCalloutProps = {
  showPrice?: boolean
}

export default function FamilyPlusAboCallout({ showPrice = true }: FamilyPlusAboCalloutProps) {
  const checkout = usePlusCheckout()
  const clickable = checkout?.canStartCheckout === true
  const checkoutBusy = checkout?.busy === 'checkout'
  const onPress = clickable ? () => void checkout!.startCheckout() : undefined

  const aboSurfaceClass = clickable
    ? `${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 border-amber-400/90 bg-gradient-to-b from-amber-50 via-amber-100/90 to-amber-200/70 px-4 py-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-70 dark:border-amber-700/80 dark:from-amber-950/50 dark:via-amber-950/35 dark:to-amber-900/40`
    : 'rounded-xl border-2 border-amber-400/90 bg-gradient-to-b from-amber-50 via-amber-100/90 to-amber-200/70 px-4 py-3.5 dark:border-amber-700/80 dark:from-amber-950/50 dark:via-amber-950/35 dark:to-amber-900/40'

  const aboContent = (
    <>
      <p className="text-base font-bold leading-snug text-amber-950 dark:text-amber-100">{FAMILY_PLUS_ABO_SLOGAN}</p>
      <p className="mt-1.5 text-sm font-semibold text-amber-900/90 dark:text-amber-200/90">
        {checkoutBusy ? 'Weiter zu Stripe …' : FAMILY_PLUS_CANCEL_NOTE}
      </p>
    </>
  )

  return (
    <div className="space-y-3">
      {showPrice ? <FamilyPlusPriceDisplay variant="hero" /> : null}
      {clickable ? (
        <button
          type="button"
          disabled={checkoutBusy}
          onClick={onPress}
          className={aboSurfaceClass}
          aria-label={`${FAMILY_PLUS_ABO_SLOGAN} — zu Stripe`}
        >
          {aboContent}
        </button>
      ) : (
        <div className={aboSurfaceClass}>{aboContent}</div>
      )}
    </div>
  )
}
