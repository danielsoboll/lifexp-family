'use client'

import FlowHintArrow from './FlowHintArrow'
import type { SetupGuideTarget } from '../lib/family/setupGuide'
import { setupGuideTargetAttr } from '../lib/family/setupGuide'

type FamilySetupGuideBubbleProps = {
  title: string
  body: string
  target: SetupGuideTarget | null
  showArrow?: boolean
  onDismiss: () => void
}

export default function FamilySetupGuideBubble({
  title,
  body,
  target,
  showArrow = true,
  onDismiss,
}: FamilySetupGuideBubbleProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[120] flex justify-center px-4">
      <button
        type="button"
        onClick={onDismiss}
        className="pointer-events-auto max-w-md rounded-2xl border border-white/30 bg-slate-900/75 px-4 py-3 text-left shadow-xl backdrop-blur-md ring-1 ring-white/10 dark:border-slate-500/40 dark:bg-slate-950/80"
      >
        {showArrow && target ? (
          <div className="-mt-1 mb-1 flex justify-center" data-setup-guide-arrow={setupGuideTargetAttr(target)}>
            <FlowHintArrow />
          </div>
        ) : null}
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="mt-1 text-sm leading-snug text-slate-200">{body}</p>
        <p className="mt-2 text-xs text-slate-400">Tippen zum Schließen — oder direkt den hervorgehobenen Button nutzen.</p>
      </button>
    </div>
  )
}

export function setupGuideHighlightClass(active: boolean): string {
  return active
    ? 'relative z-[12] ring-4 ring-yellow-400/90 ring-offset-2 ring-offset-slate-900/0 dark:ring-yellow-300/80 animate-pulse'
    : ''
}
