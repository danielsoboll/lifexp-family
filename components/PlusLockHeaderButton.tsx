'use client'

import type { ReactNode } from 'react'

import { FAMILY_PLUS_DISCOVER_LABEL } from '../lib/family/familyPlusFeatures'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

export type PlusLockHeaderButtonVariant = 'header' | 'cta'

type PlusLockHeaderButtonProps = {
  onClick: () => void
  /** Kurz für Screenreader */
  label?: string
  /** Sichtbarer Text — Standard „PLUS“ (Header-Schloss). */
  children?: ReactNode
  variant?: PlusLockHeaderButtonVariant
  showLock?: boolean
}

const PLUS_BUTTON_BASE = `${PRESSABLE_3D_CLASS} border-2 border-amber-500 bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500 font-bold text-amber-950 shadow-sm dark:border-amber-600 dark:from-amber-900/80 dark:via-amber-950/70 dark:to-amber-950 dark:text-amber-100`

const VARIANT_CLASS: Record<PlusLockHeaderButtonVariant, string> = {
  header: `${PLUS_BUTTON_BASE} flex h-12 shrink-0 items-center gap-1.5 rounded-2xl px-3 text-sm`,
  cta: `${PLUS_BUTTON_BASE} flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-base shadow-[0_4px_14px_-4px_rgba(217,119,6,0.55)] ring-1 ring-amber-400/30 dark:ring-amber-600/40`,
}

export default function PlusLockHeaderButton({
  onClick,
  label = FAMILY_PLUS_DISCOVER_LABEL,
  children = 'PLUS',
  variant = 'header',
  showLock = true,
}: PlusLockHeaderButtonProps) {
  const isHeader = variant === 'header'

  return (
    <button
      type="button"
      onClick={onClick}
      className={VARIANT_CLASS[variant]}
      aria-label={label}
      title={label}
    >
      {showLock ? (
        <span className="text-base leading-none" aria-hidden>
          🔒
        </span>
      ) : null}
      <span className={isHeader ? 'hidden min-[380px]:inline' : undefined}>{children}</span>
    </button>
  )
}
