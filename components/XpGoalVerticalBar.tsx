'use client'

type XpGoalVerticalBarProps = {
  progress: number
  target: number
  /** Gesamt-XP über dem Balken (Familien-Block) */
  totalXp?: number
  /** Klein neben Mitglieder-Charts */
  compact?: boolean
  /** Größer in der Mitglieder-Einzelansicht (Avatar-Höhe) */
  detail?: boolean
  /** Symbol über „Ziel“ (persönliches Ziel) */
  symbolEmoji?: string
  /** Noch kein aktives Ziel — Platzhalter ohne Symbol */
  emptyState?: boolean
  className?: string
}

/** Label „Gesamt XP“ — auch in der Mitglieder-Kopfzeile verwenden. */
export const HISTORY_TOTAL_XP_LABEL_CLASS =
  'text-[10px] font-semibold uppercase tracking-wide text-slate-950 dark:text-slate-400'

/** Detail-Ansicht: Balkenhöhe nach Ziel-XP — unten bündig, nur nach oben länger. */
export function xpGoalDetailBarHeightClass(target: number): string {
  const xp = Math.max(1, Math.floor(target))
  if (xp <= 30) return 'h-[5.75rem]'
  if (xp <= 100) return 'h-[10.5rem]'
  return 'h-[17rem]'
}

/** Vertikaler Ziel-Balken: oben Kreis am Ziel, Füllung von unten. */
export default function XpGoalVerticalBar({
  progress,
  target,
  totalXp,
  compact = false,
  detail = false,
  symbolEmoji,
  emptyState = false,
  className = '',
}: XpGoalVerticalBarProps) {
  const safeTarget = Math.max(1, target)
  const clampedProgress = Math.min(Math.max(0, Math.floor(progress)), safeTarget)
  const fillPercent = (clampedProgress / safeTarget) * 100

  const barHeight = detail
    ? xpGoalDetailBarHeightClass(safeTarget)
    : compact
      ? 'h-[4rem]'
      : 'h-[5.75rem]'
  const barWidth = detail ? 'w-2.5' : 'w-1.5'
  const zielLabelClass = detail
    ? 'text-[11px] font-bold leading-none text-emerald-800 dark:text-emerald-300'
    : 'text-[10px] font-bold leading-none text-emerald-800 dark:text-emerald-400'
  const zielMarginClass = detail ? 'mb-1.5' : compact ? 'mb-2' : 'mb-2.5'
  const fractionClass = detail ? (safeTarget >= 100 ? 'text-[11px]' : 'text-sm') : 'text-xs'
  const fractionMarginClass = detail ? 'mt-1.5' : compact ? 'mt-1' : 'mt-2'
  const circleSize = detail ? 'h-2.5 w-2.5' : compact ? 'h-1.5 w-1.5' : 'h-2 w-2'
  const symbolClass = detail ? 'mb-1 text-xl leading-none' : 'mb-0.5 text-sm leading-none'
  const emptyHintClass = detail
    ? emptyState
      ? 'mb-1.5 w-full px-0.5 text-center text-[9px] font-bold leading-[1.2] dark:text-amber-300'
      : 'mb-1.5 w-full px-0.5 text-center text-[9px] font-bold leading-[1.2] text-amber-700 dark:text-amber-300'
    : 'mb-1 max-w-[3.25rem] text-center text-[8px] font-semibold leading-tight text-amber-700 dark:text-amber-300'
  const fractionTextClass = detail
    ? 'font-bold tabular-nums leading-none text-slate-950 dark:text-slate-100'
    : 'font-bold tabular-nums leading-none text-slate-950 dark:text-slate-200'

  const barTrackClass = 'bg-slate-200/90 shadow-inner dark:bg-slate-700/90'

  const goalCircleClass =
    'border-emerald-600 bg-white dark:border-emerald-400 dark:bg-slate-100'

  return (
    <div className={`flex w-full flex-col items-center ${className}`.trim()}>
      {totalXp !== undefined && !compact ? (
        <div className="mb-3 w-full text-center">
          <p className={HISTORY_TOTAL_XP_LABEL_CLASS}>Gesamt XP</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{totalXp}</p>
        </div>
      ) : null}
      <div
        className={`flex w-full flex-col items-center ${detail ? 'justify-end' : ''}`}
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={safeTarget}
        aria-label={
          emptyState
            ? 'Noch kein Ziel — 0 von 100 XP'
            : `${clampedProgress} von ${safeTarget} XP zum Ziel`
        }
      >
        <div className="flex w-full flex-col items-center">
          {emptyState ? (
            <span className={`lifexp-no-goal-hint ${emptyHintClass}`}>
              noch
              <br />
              kein
              <br />
              Ziel
            </span>
          ) : symbolEmoji ? (
            <span className={symbolClass} aria-hidden>
              {symbolEmoji}
            </span>
          ) : null}
          <span className={`${zielMarginClass} ${zielLabelClass}`}>Ziel</span>
          <div className={`relative ${barWidth} ${barHeight} shrink-0`}>
            <div className={`absolute inset-0 overflow-hidden rounded-full ${barTrackClass}`}>
              {clampedProgress > 0 ? (
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-emerald-700 via-emerald-500 to-teal-300 dark:from-emerald-600 dark:via-emerald-400 dark:to-teal-300"
                  style={{ height: `${fillPercent}%` }}
                />
              ) : null}
            </div>
            <div
              className={`absolute left-1/2 top-0 ${circleSize} -translate-x-1/2 -translate-y-1/2 rounded-full border shadow-sm ${goalCircleClass}`}
              aria-hidden
            />
          </div>
        </div>
        <span className={`${fractionMarginClass} ${fractionTextClass} ${fractionClass} w-full text-center`}>
          {clampedProgress}/{safeTarget}
        </span>
      </div>
    </div>
  )
}
