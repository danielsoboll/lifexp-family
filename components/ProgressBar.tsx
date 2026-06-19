type ProgressBarProps = {
  progress: number
  /** Schmalere Leiste (z. B. kompakte Stat-Karte). */
  compact?: boolean
}

export default function ProgressBar({ progress, compact }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress))
  const remaining = 100 - clamped

  return (
    <div
      className={`${compact ? 'h-2' : 'h-3'} w-full overflow-hidden rounded-full bg-slate-200/90 shadow-inner dark:bg-slate-700/90`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Noch ${remaining} XP bis zum nächsten Level`}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-[width] duration-300 ease-out dark:from-emerald-400 dark:to-teal-400"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
