'use client'

import { FAMILY_PLUS_ABO_SLOGAN, FAMILY_PLUS_CANCEL_NOTE } from '../lib/family/familyPlusFeatures'
import FamilyPlusPriceDisplay from './FamilyPlusPriceDisplay'

type FamilyPlusAboCalloutProps = {
  showPrice?: boolean
}

export default function FamilyPlusAboCallout({ showPrice = true }: FamilyPlusAboCalloutProps) {
  return (
    <div className="space-y-3">
      {showPrice ? <FamilyPlusPriceDisplay variant="hero" /> : null}
      <div className="rounded-xl border-2 border-amber-400/90 bg-gradient-to-b from-amber-50 via-amber-100/90 to-amber-200/70 px-4 py-3.5 dark:border-amber-700/80 dark:from-amber-950/50 dark:via-amber-950/35 dark:to-amber-900/40">
        <p className="text-base font-bold leading-snug text-amber-950 dark:text-amber-100">{FAMILY_PLUS_ABO_SLOGAN}</p>
        <p className="mt-1.5 text-sm font-semibold text-amber-900/90 dark:text-amber-200/90">{FAMILY_PLUS_CANCEL_NOTE}</p>
      </div>
    </div>
  )
}
