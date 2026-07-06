'use client'

import FamilyPlusActiveWelcome from './FamilyPlusActiveWelcome'
import FamilyPlusBillingControls from './FamilyPlusBillingControls'
import FamilyPlusAboCallout from './FamilyPlusAboCallout'
import FamilyPlusFeaturesList from './FamilyPlusFeaturesList'
import FamilyPlusPriceDisplay from './FamilyPlusPriceDisplay'
import SheetPortal from './SheetPortal'
import { PlusCheckoutProvider } from '../hooks/usePlusCheckout'
import { useFamily } from './FamilyProvider'
import {
  FAMILY_PLUS_SHEET,
} from '../lib/family/familyPlusFeatures'
import { isFamilyPlus } from '../lib/family/familyPlus'
import { CARD_SURFACE_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

type FamilyPlusFeaturesSheetProps = {
  onClose: () => void
}

export default function FamilyPlusFeaturesSheet({ onClose }: FamilyPlusFeaturesSheetProps) {
  const { family } = useFamily()
  const plusActive = isFamilyPlus(family)

  return (
    <SheetPortal>
      <div
        className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/40 dark:bg-black/55"
        onClick={onClose}
        role="presentation"
      >
        <div
          className={`lifexp-bottom-sheet ${CARD_SURFACE_CLASS} flex max-h-[88dvh] min-h-[50dvh] flex-col rounded-t-3xl px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl`}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="plus-features-sheet-title"
        >
          <div className="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-slate-400/70 dark:bg-slate-500" />

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              LifeXP Family PLUS
            </p>
            <h2
              id="plus-features-sheet-title"
              className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100"
            >
              {plusActive ? FAMILY_PLUS_SHEET.titleActive : FAMILY_PLUS_SHEET.titleFree}
            </h2>
            {!plusActive ? (
              <PlusCheckoutProvider>
                <p className="mt-2 text-sm leading-relaxed text-slate-950 dark:text-slate-300">
                  {FAMILY_PLUS_SHEET.introFree}
                </p>
                <div className="mt-4 space-y-3">
                  <FamilyPlusPriceDisplay variant="hero" />
                  <FamilyPlusAboCallout showPrice={false} />
                </div>
                <FamilyPlusFeaturesList />
                <div className="mt-5">
                  <FamilyPlusBillingControls compact showPriceBadge={false} showActiveWelcome={false} />
                </div>
              </PlusCheckoutProvider>
            ) : (
              <>
                <FamilyPlusActiveWelcome className="mt-4" />
                <div className="mt-5">
                  <FamilyPlusBillingControls compact showPriceBadge={false} showActiveWelcome={false} />
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`${PRESSABLE_3D_CLASS} mt-4 w-full shrink-0 rounded-xl border-2 border-slate-400 bg-gradient-to-b from-slate-100 to-slate-300 px-4 py-3 text-sm font-bold text-slate-900 dark:border-slate-600 dark:from-slate-700 dark:to-slate-900 dark:text-slate-100`}
          >
            Schließen
          </button>
        </div>
      </div>
    </SheetPortal>
  )
}
