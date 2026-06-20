'use client'

import {
  clampMemberDailyXp,
  MEMBER_DAILY_XP_BOOST_THRESHOLD,
  MEMBER_DAILY_XP_MAX,
  MEMBER_DAILY_XP_TARGET,
  memberDailyXpShowBoostZone,
} from '../lib/family/dailyXpDisplay'

type MemberDailyXpBarProps = {
  todayXp: number
  /** Kompakter für Verlauf-Zeilen */
  compact?: boolean
  /** Boost-Bereich gelb → rot (Verlauf) statt Life-XP lime/orange */
  boostWarm?: boolean
}

export default function MemberDailyXpBar({
  todayXp,
  compact = false,
  boostWarm = false,
}: MemberDailyXpBarProps) {
  const progress = clampMemberDailyXp(todayXp)
  const scaleMax = MEMBER_DAILY_XP_MAX
  const target = MEMBER_DAILY_XP_TARGET
  const boostThreshold = MEMBER_DAILY_XP_BOOST_THRESHOLD
  const showBoostZone = memberDailyXpShowBoostZone(progress)

  const barProgressPercent = (progress / scaleMax) * 100
  const targetPercent = Math.min(100, (target / scaleMax) * 100)
  const boostStartPercent = Math.min(100, (boostThreshold / scaleMax) * 100)
  const boostZoneMidPercent = boostStartPercent + (100 - boostStartPercent) / 2
  const reachedTarget = progress >= target

  const fillClassName = showBoostZone
    ? boostWarm
      ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-red-500 dark:from-yellow-500 dark:via-orange-500 dark:to-red-500'
      : 'bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400'
    : reachedTarget
      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400'
      : 'bg-gradient-to-r from-teal-300 to-lime-300 dark:from-teal-400 dark:to-lime-400'

  const boostZoneClassName = boostWarm
    ? 'bg-gradient-to-r from-yellow-200/95 via-amber-300/95 to-red-400/90 dark:from-yellow-600/55 dark:via-orange-500/60 dark:to-red-600/70'
    : 'bg-gradient-to-r from-lime-300/90 via-amber-300/90 to-orange-400/95 dark:from-lime-600/60 dark:via-amber-500/65 dark:to-orange-600/75'

  const barHeight = compact ? 'h-1.5' : 'h-2'
  const labelTop = compact ? '-0.55rem' : '-0.65rem'
  const goalLabelClass = compact ? 'text-[7px]' : 'text-[8px]'
  const boostLabelClass = compact ? 'text-[6px]' : 'text-[7px]'
  const xpLabelClass = compact ? 'text-[9px]' : 'text-[10px]'
  const topPad = showBoostZone ? (compact ? 'pt-2' : 'pt-2.5') : compact ? 'pt-1.5' : 'pt-2'

  return (
    <div className={`w-full ${topPad}`}>
      {!compact ? (
        <div className="mb-0.5 flex items-center justify-between gap-1">
          <span className={`font-bold tabular-nums text-emerald-700 dark:text-emerald-400 ${xpLabelClass}`}>
            {progress}/{scaleMax} XP
          </span>
        </div>
      ) : null}
      <div
        className={`relative w-full overflow-visible rounded-full bg-slate-200/90 shadow-inner dark:bg-slate-700/90 ${barHeight}`}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={scaleMax}
        aria-label={`${progress} von ${scaleMax} XP heute, Ziel ${target}${showBoostZone ? ', Boost-Modus' : ''}`}
      >
        <div className="absolute inset-0 overflow-hidden rounded-full">
          {showBoostZone ? (
            <div
              className={`absolute inset-y-0 right-0 rounded-r-full ${boostZoneClassName}`}
              style={{ left: `${boostStartPercent}%` }}
              aria-hidden
            />
          ) : null}
          <div
            className={`absolute top-0 left-0 z-10 h-full rounded-full transition-[width] duration-300 ease-out ${fillClassName}`}
            style={{ width: `${barProgressPercent}%` }}
          />
        </div>
        <div
          className={`absolute -translate-x-1/2 font-semibold leading-none text-emerald-600/80 dark:text-emerald-400/85 ${goalLabelClass}`}
          style={{ left: `${targetPercent}%`, top: labelTop }}
        >
          Ziel
        </div>
        {showBoostZone ? (
          <div
            className={`absolute -translate-x-1/2 whitespace-nowrap text-center font-bold uppercase tracking-wide ${
              boostWarm ? 'text-red-700 dark:text-red-300' : 'text-orange-700 dark:text-orange-300'
            } ${boostLabelClass}`}
            style={{ left: `${boostZoneMidPercent}%`, top: labelTop }}
          >
            Boost <span aria-hidden>→</span>
          </div>
        ) : null}
        <div
          className={`absolute top-0 ${barHeight} w-px -translate-x-1/2 bg-emerald-500/55 dark:bg-emerald-400/50`}
          style={{ left: `${targetPercent}%` }}
        />
      </div>
      {compact ? (
        <p className={`mt-0.5 font-bold tabular-nums text-emerald-700 dark:text-emerald-400 ${xpLabelClass}`}>
          {progress}/{scaleMax} XP
        </p>
      ) : null}
    </div>
  )
}
