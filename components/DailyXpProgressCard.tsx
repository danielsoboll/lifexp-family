import Link from 'next/link'

import { CARD_SURFACE_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

type DailyXpProgressCardProps = {
  label: string
  value: number
  max: number
  target: number
  icon?: string
  errorMessage?: string
  /** Kompaktere Darstellung für die XP-Übersicht. */
  compact?: boolean
  /** Vertikal verfügbaren Platz gleichmäßig nutzen (XP-Übersicht). */
  fill?: boolean
  /** Navigation zur XP-Historie. */
  href?: string
  /** Klick-Aktion (z. B. Hinweis in der XP-Übersicht). */
  onPress?: () => void
  /** Boost-Bereich (nur Trainings-XP). */
  boostMode?: boolean
  /** Balken-Skala vor Boost (z. B. 30 bei Trainings-XP). */
  barMax?: number
  /** XP ab dem Boost-Bereich sichtbar wird (z. B. 21 bei Trainings-/Ernährungs-XP). */
  boostThreshold?: number
  /** Boost-Bereich anzeigen (z. B. Ernährung erst nach Tagesabschluss). Standard: true. */
  boostUnlocked?: boolean
}

function clamp(value: number, max: number): number {
  return Math.min(max, Math.max(0, value))
}

export default function DailyXpProgressCard({
  label,
  value,
  max,
  target,
  icon,
  errorMessage,
  compact = false,
  fill = false,
  href,
  onPress,
  boostMode = false,
  barMax,
  boostThreshold,
  boostUnlocked = true,
}: DailyXpProgressCardProps) {
  const progress = clamp(value, max)
  const showBoostZone =
    boostMode && boostUnlocked && boostThreshold != null && progress >= boostThreshold
  const scaleMax = boostMode && barMax != null ? (showBoostZone ? max : barMax) : max
  const displayMax = scaleMax
  const barProgress = clamp(value, scaleMax)
  const barProgressPercent = (barProgress / scaleMax) * 100
  const targetPercent = Math.min(100, (target / scaleMax) * 100)
  const boostStartPercent =
    showBoostZone && boostThreshold != null
      ? Math.min(100, (boostThreshold / scaleMax) * 100)
      : targetPercent
  const boostZoneMidPercent = boostStartPercent + (100 - boostStartPercent) / 2
  const reachedTarget = progress >= target
  const baseFillPercent = barProgressPercent
  const fillClassName = showBoostZone || reachedTarget
    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400'
    : 'bg-gradient-to-r from-teal-300 to-lime-300 dark:from-teal-400 dark:to-lime-400'
  const labelTop = compact ? '-0.75rem' : '-0.9rem'

  const body = (
    <>
      <div className={`flex items-end justify-between gap-2 ${compact ? 'mb-1' : 'mb-1.5'}`}>
        <p
          className={`font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 ${
            compact ? 'text-[11px] leading-tight' : 'text-xs'
          }`}
        >
          {label}
        </p>
        <p
          className={`text-right font-bold tabular-nums text-emerald-700 dark:text-emerald-400 ${
            compact ? 'text-sm leading-tight' : 'text-sm'
          }`}
        >
          <span>
            {progress}/{displayMax}
          </span>
          <span
            className={`block font-semibold text-slate-500 dark:text-slate-400 ${
              compact ? 'text-[10px] leading-tight' : 'text-xs'
            }`}
          >
            Ziel {target}
          </span>
        </p>
      </div>
      <div className={`flex items-center ${compact ? 'gap-2' : 'gap-2.5'}`}>
        <div
          className={`relative flex-1 overflow-visible rounded-full bg-slate-200/90 shadow-inner dark:bg-slate-700/90 ${
            compact ? 'h-2.5' : 'h-2.5'
          }`}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={displayMax}
          aria-label={`${label}: ${progress} von ${displayMax} XP, Ziel ${target}${showBoostZone ? ', Boost-Modus' : ''}`}
        >
          <div className="absolute inset-0 overflow-hidden rounded-full">
            {showBoostZone ? (
              <div
                className="absolute inset-y-0 right-0 rounded-r-full bg-gradient-to-r from-lime-300/90 via-amber-300/90 to-orange-400/95 dark:from-lime-600/60 dark:via-amber-500/65 dark:to-orange-600/75"
                style={{ left: `${boostStartPercent}%` }}
                aria-hidden
              />
            ) : null}
            <div
              className={`absolute top-0 left-0 z-10 h-full rounded-full transition-[width] duration-300 ease-out ${fillClassName}`}
              style={{ width: `${baseFillPercent}%` }}
            />
          </div>
          <div
            className={`absolute -translate-x-1/2 font-semibold leading-none text-emerald-600/80 dark:text-emerald-400/85 ${
              compact ? 'text-[9px]' : 'text-[10px]'
            }`}
            style={{ left: `${targetPercent}%`, top: labelTop }}
          >
            Ziel
          </div>
          {showBoostZone ? (
            <div
              className={`absolute -translate-x-1/2 whitespace-nowrap text-center font-bold uppercase tracking-wide text-orange-700 dark:text-orange-300 ${
                compact ? 'text-[8px]' : 'text-[9px]'
              }`}
              style={{ left: `${boostZoneMidPercent}%`, top: labelTop }}
            >
              Boost mode <span aria-hidden>→</span>
            </div>
          ) : null}
          <div
            className={`absolute -translate-x-1/2 bg-emerald-500/55 dark:bg-emerald-400/50 ${
              compact ? 'top-0 h-2 w-px' : 'top-0 h-2.5 w-px'
            }`}
            style={{ left: `${targetPercent}%` }}
          />
        </div>
        {icon ? (
          <span
            className={`shrink-0 text-center ${compact ? 'w-6 text-lg leading-none' : 'w-7 text-lg'}`}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
      </div>
      {errorMessage ? (
        <p className="mt-2 text-xs text-red-700 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </>
  )

  const className = `rounded-xl ${CARD_SURFACE_CLASS} ${
    fill ? 'flex min-h-0 flex-1 flex-col justify-center' : ''
  } ${compact ? 'px-2.5 py-2' : 'rounded-2xl px-3 py-2.5'} ${
    showBoostZone ? (compact ? 'pt-3' : 'pt-3.5') : ''
  } ${
    href || onPress
      ? `${PRESSABLE_3D_CLASS} block w-full text-left hover:border-emerald-400/80 dark:hover:border-emerald-500/70`
      : ''
  }`

  if (href) {
    return (
      <Link href={href} className={className} aria-live="polite">
        {body}
      </Link>
    )
  }

  if (onPress) {
    return (
      <button type="button" onClick={onPress} className={className} aria-live="polite">
        {body}
      </button>
    )
  }

  return (
    <section className={className} aria-live="polite">
      {body}
    </section>
  )
}
