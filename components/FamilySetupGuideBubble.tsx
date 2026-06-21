'use client'

import SetupGuideTargetArrow from './SetupGuideTargetArrow'
import type { SetupGuideTarget } from '../lib/family/setupGuide'

type FamilySetupGuideBubbleProps = {
  title: string
  body: string
  target: SetupGuideTarget | null
  showArrow?: boolean
  showBrandMark?: boolean
  onDismiss: () => void
}

/** Gradient-Rand mit weich auslaufenden Halo-Ringen — Hintergrund bleibt sichtbar. */
const HINT_CARD_SHELL_CLASS =
  'pointer-events-auto relative w-full max-w-sm rounded-[1.65rem] p-[3px] ' +
  'bg-gradient-to-br from-white/55 via-slate-300/38 to-slate-500/28 ' +
  'shadow-[0_0_0_1px_rgba(255,255,255,0.58),0_0_0_12px_rgba(255,255,255,0.26),0_0_0_24px_rgba(203,213,225,0.11),0_0_0_40px_rgba(148,163,184,0.04)] ' +
  'dark:from-white/28 dark:via-slate-300/18 dark:to-white/10 ' +
  'dark:shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_0_0_12px_rgba(255,255,255,0.08),0_0_0_24px_rgba(255,255,255,0.035),0_0_0_40px_rgba(255,255,255,0.01)]'

const HINT_CARD_INNER_CLASS =
  'w-full rounded-[1.45rem] px-5 py-4 text-center backdrop-blur-xl ' +
  'bg-gradient-to-b from-slate-200/92 via-slate-100/96 to-slate-200/88 ' +
  'dark:from-slate-500/88 dark:via-slate-400/78 dark:to-slate-500/82'

export default function FamilySetupGuideBubble({
  title,
  body,
  target,
  showArrow = true,
  showBrandMark = true,
  onDismiss,
}: FamilySetupGuideBubbleProps) {
  return (
    <>
      {showArrow && target ? <SetupGuideTargetArrow target={target} /> : null}
      <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center px-6 pb-[max(3rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
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
            <p className="mt-2 text-base leading-relaxed text-slate-800 dark:text-slate-900/95">{body}</p>
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
