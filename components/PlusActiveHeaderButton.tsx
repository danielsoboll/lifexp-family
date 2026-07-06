'use client'

type PlusActiveHeaderButtonProps = {
  label?: string
}

/** PLUS aktiv — nur Anzeige im Header (nicht klickbar). */
export default function PlusActiveHeaderButton({
  label = 'LifeXP Family PLUS ist aktiv',
}: PlusActiveHeaderButtonProps) {
  return (
    <div
      className="flex h-12 shrink-0 items-center gap-1.5 px-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"
      aria-label={label}
      title={label}
    >
      <span className="text-base leading-none" aria-hidden>
        ✨
      </span>
      <span className="hidden min-[380px]:inline">PLUS</span>
    </div>
  )
}
