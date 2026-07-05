'use client'

import SetupGuideTargetArrow from './SetupGuideTargetArrow'
import type { SetupGuideTarget } from '../lib/family/setupGuide'

type FamilySetupGuideBubbleProps = {
  title: string
  body: string
  target: SetupGuideTarget | null
  showArrow?: boolean
  showBrandMark?: boolean
  verticalPlacement?: 'center' | 'lower'
  onDismiss: () => void
}

/** Gradient-Rand mit weich auslaufenden Halo-Ringen — Hintergrund bleibt sichtbar. */
const HINT_CARD_SHELL_CLASS =
  'pointer-events-auto relative w-full max-w-sm rounded-[1.65rem] p-[3px] ' +
  'bg-gradient-to-br from-white/40 via-slate-400/42 to-slate-600/32 ' +
  'shadow-[0_0_0_1px_rgba(255,255,255,0.48),0_0_0_12px_rgba(255,255,255,0.18),0_0_0_24px_rgba(148,163,184,0.14),0_0_0_40px_rgba(100,116,139,0.06)] ' +
  'dark:from-white/48 dark:via-slate-200/36 dark:to-white/24 ' +
  'dark:shadow-[0_0_0_1px_rgba(255,255,255,0.32),0_0_0_12px_rgba(255,255,255,0.14),0_0_0_24px_rgba(255,255,255,0.06),0_0_0_40px_rgba(255,255,255,0.025)]'

const HINT_CARD_INNER_CLASS =
  'w-full rounded-[1.45rem] px-5 py-4 text-center backdrop-blur-xl ' +
  'bg-gradient-to-b from-slate-400/94 via-slate-300/97 to-slate-400/91 ' +
  'dark:from-slate-200/95 dark:via-slate-100/93 dark:to-slate-200/92'

export default function FamilySetupGuideBubble({
  title,
  body,
  target,
  showArrow = true,
  showBrandMark = true,
  verticalPlacement = 'center',
  onDismiss,
}: FamilySetupGuideBubbleProps) {
  const overlayClass =
    verticalPlacement === 'lower'
      ? 'pointer-events-none fixed inset-0 z-[120] flex items-start justify-center px-6 pt-[55vh] pb-[max(2rem,env(safe-area-inset-bottom))]'
      : 'pointer-events-none fixed inset-0 z-[120] flex items-center justify-center px-6 pb-[max(3rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]'

  return (
    <>
      {showArrow && target ? <SetupGuideTargetArrow target={target} /> : null}
      <div className={overlayClass}>
        <div className={HINT_CARD_SHELL_CLASS}>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={`${title}. Tippen zum Schließen`}
            className={HINT_CARD_INNER_CLASS}
          >
            <p className="text-lg font-bold leading-snug text-slate-900 dark:text-slate-950">
              {showBrandMark ? (
                <span aria-hidden className="mr-1.5">
                  🔥
                </span>
              ) : null}
              {title}
            </p>
            <p className="mt-2 text-base leading-relaxed text-slate-950 dark:text-slate-900/95">{body}</p>
          </button>
        </div>
      </div>
    </>
  )
}

export function setupGuideHighlightClass(active: boolean): string {
  return active
    ? 'relative z-[12] ring-4 ring-amber-400/90 ring-offset-2 ring-offset-white dark:ring-yellow-300/85 dark:ring-offset-black/0 animate-pulse'
    : ''
}
