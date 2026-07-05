'use client'

import { useEffect, useState } from 'react'

import FamilyPlusBillingControls from './FamilyPlusBillingControls'
import FamilyPlusAboCallout from './FamilyPlusAboCallout'
import FamilyPlusFeaturesList from './FamilyPlusFeaturesList'
import FamilyPlusPriceDisplay from './FamilyPlusPriceDisplay'
import SheetPortal from './SheetPortal'
import { useFamily } from './FamilyProvider'
import {
  FAMILY_PLUS_ACTIVATED_BANNER,
  FAMILY_PLUS_SHEET,
} from '../lib/family/familyPlusFeatures'
import { isFamilyPlus } from '../lib/family/familyPlus'
import {
  hasSeenPlusActivatedNotice,
  markPlusActivatedNoticeSeen,
  PLUS_ACTIVATED_NOTICE_CHANGED_EVENT,
} from '../lib/family/plusActivatedNotice'
import { CARD_SURFACE_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

type FamilyPlusFeaturesSheetProps = {
  onClose: () => void
}

export default function FamilyPlusFeaturesSheet({ onClose }: FamilyPlusFeaturesSheetProps) {
  const { family } = useFamily()
  const plusActive = isFamilyPlus(family)
  const [showActivatedBanner, setShowActivatedBanner] = useState(false)

  useEffect(() => {
    if (!family?.id || !plusActive) {
      setShowActivatedBanner(false)
      return
    }
    const refresh = () => setShowActivatedBanner(!hasSeenPlusActivatedNotice(family.id))
    refresh()
    window.addEventListener(PLUS_ACTIVATED_NOTICE_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(PLUS_ACTIVATED_NOTICE_CHANGED_EVENT, refresh)
  }, [family?.id, plusActive])

  const dismissActivatedBanner = () => {
    if (!family?.id) return
    markPlusActivatedNoticeSeen(family.id)
    setShowActivatedBanner(false)
  }

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
            <p className="mt-2 text-sm leading-relaxed text-slate-950 dark:text-slate-300">
              {plusActive ? FAMILY_PLUS_SHEET.introActive : FAMILY_PLUS_SHEET.introFree}
            </p>
            {plusActive && showActivatedBanner ? (
              <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-3 dark:border-emerald-800 dark:bg-emerald-950/40">
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">{FAMILY_PLUS_ACTIVATED_BANNER}</p>
                <button
                  type="button"
                  onClick={dismissActivatedBanner}
                  className="mt-2 text-xs font-semibold text-emerald-800 underline underline-offset-2 dark:text-emerald-200"
                >
                  Verstanden
                </button>
              </div>
            ) : null}
            {!plusActive ? (
              <div className="mt-4 space-y-3">
                <FamilyPlusPriceDisplay variant="hero" />
                <FamilyPlusAboCallout showPrice={false} />
              </div>
            ) : null}

            <FamilyPlusFeaturesList />

            <div className="mt-5">
              <FamilyPlusBillingControls compact showPriceBadge={false} />
            </div>
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
