'use client'

import type { ReactNode } from 'react'

import { FAMILY_PLUS_DISCOVER_LABEL } from '../lib/family/familyPlusFeatures'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type PlusLockHeaderButtonProps = {
  onClick: () => void
  /** Kurz für Screenreader */
  label?: string
  /** Sichtbarer Text — Standard „PLUS“ (Header-Schloss). */
  children?: ReactNode
  fullWidth?: boolean
  showLock?: boolean
}

const PLUS_BUTTON_CLASS = `${PRESSABLE_3D_CLASS} border-2 border-amber-500 bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500 text-sm font-bold text-amber-950 shadow-sm dark:border-amber-600 dark:from-amber-900/80 dark:via-amber-950/70 dark:to-amber-950 dark:text-amber-100`

export default function PlusLockHeaderButton({
  onClick,
  label = FAMILY_PLUS_DISCOVER_LABEL,
  children = 'PLUS',
  fullWidth = false,
  showLock = true,
}: PlusLockHeaderButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        fullWidth
          ? `${PLUS_BUTTON_CLASS} flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3`
          : `${PLUS_BUTTON_CLASS} flex h-12 shrink-0 items-center gap-1.5 rounded-2xl px-3`
      }
      aria-label={label}
      title={label}
    >
      {showLock ? (
        <span className="text-base leading-none" aria-hidden>
          🔒
        </span>
      ) : null}
      <span className={fullWidth ? undefined : 'hidden min-[380px]:inline'}>{children}</span>
    </button>
  )
}
