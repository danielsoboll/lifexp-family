'use client'

import { FAMILY_PLUS_DISCOVER_LABEL } from '../lib/family/familyPlusFeatures'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type PlusActiveHeaderButtonProps = {
  onClick: () => void
  label?: string
}

export default function PlusActiveHeaderButton({
  onClick,
  label = 'LifeXP Family PLUS ist aktiv',
}: PlusActiveHeaderButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${PRESSABLE_3D_CLASS} flex h-12 shrink-0 items-center gap-1.5 rounded-2xl border-2 border-emerald-500 bg-gradient-to-b from-emerald-200 via-emerald-300 to-emerald-500 px-3 text-sm font-bold text-emerald-950 shadow-[0_0_12px_-2px_rgba(16,185,129,0.55)] dark:border-emerald-600 dark:from-emerald-900/80 dark:via-emerald-950/70 dark:to-emerald-950 dark:text-emerald-100`}
      aria-label={label}
      title={label}
    >
      <span className="text-base leading-none" aria-hidden>
        ✨
      </span>
      <span className="hidden min-[380px]:inline">PLUS</span>
    </button>
  )
}
