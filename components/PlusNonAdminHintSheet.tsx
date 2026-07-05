'use client'

import SheetPortal from './SheetPortal'
import {
  FAMILY_PLUS_NON_ADMIN_HINT_FOOTER,
  FAMILY_PLUS_NON_ADMIN_HINT_HEADLINE,
  FAMILY_PLUS_NON_ADMIN_HINT_HIGHLIGHTS,
  FAMILY_PLUS_NON_ADMIN_HINT_INTRO,
} from '../lib/family/familyPlusFeatures'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type PlusNonAdminHintSheetProps = {
  onClose: () => void
}

export default function PlusNonAdminHintSheet({ onClose }: PlusNonAdminHintSheetProps) {
  return (
    <SheetPortal>
      <div
        className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/50 backdrop-blur-[2px] dark:bg-black/60"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="lifexp-bottom-sheet overflow-hidden rounded-t-[1.75rem] border-2 border-amber-300/80 bg-gradient-to-b from-amber-50 via-white to-white shadow-[0_-12px_48px_-12px_rgba(217,119,6,0.35)] dark:border-amber-700/70 dark:from-amber-950/90 dark:via-slate-950 dark:to-slate-950"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="plus-non-admin-hint-title"
        >
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-amber-300/80 dark:bg-amber-700/80" />

          <div className="relative px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-amber-200/40 to-transparent dark:from-amber-800/25"
              aria-hidden
            />

            <div className="relative flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-400/90 bg-gradient-to-b from-amber-100 via-amber-50 to-amber-200/80 text-3xl shadow-[0_8px_24px_-8px_rgba(217,119,6,0.45)] ring-2 ring-amber-200/60 dark:border-amber-600/80 dark:from-amber-950/70 dark:via-amber-900/40 dark:to-amber-950/60 dark:ring-amber-800/40">
                <span aria-hidden>✨</span>
              </div>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-800/90 dark:text-amber-300/90">
                LifeXP Family PLUS
              </p>
              <h2
                id="plus-non-admin-hint-title"
                className="mt-1 text-[1.35rem] font-bold leading-tight tracking-tight text-amber-950 dark:text-amber-50"
              >
                {FAMILY_PLUS_NON_ADMIN_HINT_HEADLINE}
              </h2>
            </div>

            <p className="relative mt-5 text-center text-sm font-semibold text-slate-800 dark:text-slate-200">
              {FAMILY_PLUS_NON_ADMIN_HINT_INTRO}
            </p>

            <ul className="relative mt-3 grid grid-cols-3 gap-2">
              {FAMILY_PLUS_NON_ADMIN_HINT_HIGHLIGHTS.map((item) => (
                <li
                  key={item.label}
                  className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-amber-200/90 bg-white/90 px-2 py-3 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/35"
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {item.emoji}
                  </span>
                  <span className="text-center text-[11px] font-bold leading-snug text-amber-950 dark:text-amber-100">
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>

            <p className="relative mt-4 rounded-2xl border-2 border-amber-300/70 bg-gradient-to-b from-amber-50/95 to-amber-100/50 px-4 py-3.5 text-center text-[15px] font-medium leading-relaxed text-amber-950 dark:border-amber-800/50 dark:from-amber-950/50 dark:to-amber-900/30 dark:text-amber-50">
              {FAMILY_PLUS_NON_ADMIN_HINT_FOOTER}
            </p>

            <button
              type="button"
              onClick={onClose}
              className={`${PRESSABLE_3D_CLASS} mt-5 w-full rounded-xl border-2 border-amber-500 bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-3.5 text-base font-bold text-amber-950 shadow-[0_4px_14px_-4px_rgba(217,119,6,0.55)] ring-1 ring-amber-400/30 dark:border-amber-600 dark:from-amber-900/80 dark:via-amber-950/70 dark:to-amber-950 dark:text-amber-100 dark:ring-amber-600/40`}
            >
              Alles klar!
            </button>
          </div>
        </div>
      </div>
    </SheetPortal>
  )
}
