'use client'

type XpGoalVerticalBarProps = {
  progress: number
  target: number
  /** Gesamt-XP über dem Balken (Familien-Block) */
  totalXp?: number
  /** Klein neben Mitglieder-Charts */
  compact?: boolean
  className?: string
}

/** Label „Gesamt XP“ — auch in der Mitglieder-Kopfzeile verwenden. */
export const HISTORY_TOTAL_XP_LABEL_CLASS =
  'text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400'

/** Vertikaler Ziel-Balken: oben Kreis am Ziel, Füllung von unten. */
export default function XpGoalVerticalBar({
  progress,
  target,
  totalXp,
  compact = false,
  className = '',
}: XpGoalVerticalBarProps) {
  const safeTarget = Math.max(1, target)
  const clampedProgress = Math.min(Math.max(0, Math.floor(progress)), safeTarget)
  const fillPercent = (clampedProgress / safeTarget) * 100

  const barHeight = compact ? 'h-[4rem]' : 'h-[5.75rem]'
  const barWidth = 'w-1.5'
  const zielLabelClass = 'text-[10px] font-bold leading-none text-emerald-700 dark:text-emerald-400'
  const zielMarginClass = compact ? 'mb-2' : 'mb-2.5'
  const fractionClass = 'text-xs'
  const fractionMarginClass = compact ? 'mt-1' : 'mt-2'
  const circleSize = compact ? 'h-1.5 w-1.5' : 'h-2 w-2'

  return (
    <div className={`flex w-full flex-col items-center ${className}`.trim()}>
      {totalXp !== undefined && !compact ? (
        <div className="mb-3 w-full text-center">
          <p className={HISTORY_TOTAL_XP_LABEL_CLASS}>Gesamt XP</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{totalXp}</p>
        </div>
      ) : null}
      <div
        className="flex w-full flex-col items-center"
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={safeTarget}
        aria-label={`${clampedProgress} von ${safeTarget} XP zum Ziel`}
      >
        <span className={`${zielMarginClass} ${zielLabelClass}`}>Ziel</span>
        <div className={`relative ${barWidth} ${barHeight} shrink-0`}>
          <div className="absolute inset-0 overflow-hidden rounded-full bg-slate-200/90 shadow-inner dark:bg-slate-700/90">
            {clampedProgress > 0 ? (
              <div
                className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-emerald-700 via-emerald-500 to-teal-300 dark:from-emerald-600 dark:via-emerald-400 dark:to-teal-300"
                style={{ height: `${fillPercent}%` }}
              />
            ) : null}
          </div>
          <div
            className={`absolute left-1/2 top-0 ${circleSize} -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-600 bg-white shadow-sm dark:border-emerald-400 dark:bg-slate-100`}
            aria-hidden
          />
        </div>
        <span
          className={`${fractionMarginClass} font-bold tabular-nums leading-none text-slate-700 dark:text-slate-200 ${fractionClass}`}
        >
          {clampedProgress}/{safeTarget}
        </span>
      </div>
    </div>
  )
}
