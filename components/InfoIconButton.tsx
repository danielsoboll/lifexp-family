'use client'

import { PRESSABLE_3D_CLASS } from '../lib/appShell'

const INFO_ICON_BUTTON_CLASS = `${PRESSABLE_3D_CLASS} flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-sky-300 bg-gradient-to-b from-sky-50 via-sky-100/95 to-blue-200/80 text-xl font-black text-sky-700 dark:border-sky-500/70 dark:from-sky-900/80 dark:via-sky-950/60 dark:to-blue-950 dark:text-sky-100`

type InfoIconButtonProps = {
  label: string
  onClick: () => void
}

export default function InfoIconButton({ label, onClick }: InfoIconButtonProps) {
  return (
    <button type="button" onClick={onClick} className={INFO_ICON_BUTTON_CLASS} aria-label={label} title="Info">
      i
    </button>
  )
}
