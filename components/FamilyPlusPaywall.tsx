'use client'

import type { ReactNode } from 'react'

import FamilyPlusAboCallout from './FamilyPlusAboCallout'
import FamilyPlusBillingControls from './FamilyPlusBillingControls'
import FamilyPlusFeaturesList from './FamilyPlusFeaturesList'
import FamilyPlusPriceDisplay from './FamilyPlusPriceDisplay'
import { useFamily } from './FamilyProvider'
import { isFamilyPlus } from '../lib/family/familyPlus'
import { FAMILY_PLUS_TAGLINE } from '../lib/family/familyPlusFeatures'
import type { Family } from '../lib/family/types'
import { CARD_SURFACE_CLASS } from '../lib/appShell'

type FamilyPlusPaywallProps = {
  family?: Family | null
  /** z. B. „Foto-Bestätigung“ */
  featureTitle?: string
  featureDescription?: string
  children: ReactNode
}

export default function FamilyPlusPaywall({
  family: familyProp,
  featureTitle = 'Foto-Bestätigung',
  featureDescription,
  children,
}: FamilyPlusPaywallProps) {
  const { family: familyFromContext } = useFamily()
  const family = familyProp ?? familyFromContext

  if (isFamilyPlus(family)) {
    return <>{children}</>
  }

  return (
    <div className={`${CARD_SURFACE_CLASS} space-y-4 rounded-2xl p-4`}>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          LifeXP Family PLUS
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{featureTitle}</h2>
        <p className="mt-2 text-sm text-slate-950 dark:text-slate-300">{FAMILY_PLUS_TAGLINE}</p>
        {featureDescription ? (
          <p className="mt-2 text-sm text-slate-950 dark:text-slate-300">{featureDescription}</p>
        ) : null}
      </div>
      <FamilyPlusPriceDisplay variant="hero" />
      <FamilyPlusAboCallout showPrice={false} />
      <FamilyPlusFeaturesList className="mt-0" />
      <FamilyPlusBillingControls family={family} showPriceBadge={false} />
    </div>
  )
}
