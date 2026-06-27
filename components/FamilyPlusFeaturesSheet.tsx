'use client'

import FamilyPlusBillingControls from './FamilyPlusBillingControls'
import SheetPortal from './SheetPortal'
import { useFamily } from './FamilyProvider'
import { FAMILY_PLUS_ABO_NOTE, FAMILY_PLUS_FEATURES, FAMILY_PLUS_SHEET } from '../lib/family/familyPlusFeatures'
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
            <p className="mt-2 text-sm leading-relaxed text-slate-950 dark:text-slate-300">
              {plusActive ? FAMILY_PLUS_SHEET.introActive : FAMILY_PLUS_SHEET.introFree}
            </p>
            {!plusActive ? (
              <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-400">
                {FAMILY_PLUS_ABO_NOTE}
              </p>
            ) : null}

            <ul className="mt-4 space-y-2.5">
              {FAMILY_PLUS_FEATURES.map((feature) => (
                <li
                  key={feature.id}
                  className="flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50/60 px-3 py-3 dark:border-amber-900/50 dark:bg-amber-950/25"
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {feature.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{feature.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-800 dark:text-slate-300">
                      {feature.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-5">
              <FamilyPlusBillingControls compact />
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
