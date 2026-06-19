'use client'

import { useId, useLayoutEffect, useRef, useState } from 'react'

import type { AvatarGender } from '../lib/avatarLibrary'
import {
  clampLigaXp,
  getLigaProgressFraction,
  getLigaProgressLineBottomPercent,
  getLigaTierTitle,
  getLigaVerticalFillPercents,
  getNextLigaTierId,
  LIGA_TIERS,
  LIGA_XP_MAX,
  type LigaTierId,
} from '../lib/liga'

const TIER_FLEX_CLASS: Record<string, string> = {
  recruit: 'flex-[1.2]',
  fighter: 'flex-1',
  bronze: 'flex-1',
  silver: 'flex-1',
  gold: 'flex-[1.15]',
}

/** Hell → schnell dunkel bis Schriftfeld, rechts wieder hell-gold. */
const LIGA_HORIZONTAL_GOLD_GRADIENT =
  'linear-gradient(90deg, #fffbeb 0%, #fde68a 6%, #f59e0b 18%, #b45309 30%, #92400e 34%, #fbbf24 46%, #fde68a 68%, #fef3c7 100%)'

function LigaProgressArrow({ gradientId }: { gradientId: string }) {
  return (
    <svg
      width="13"
      height="9"
      viewBox="0 0 13 9"
      className="block h-[9px] w-[13px] sm:h-2.5 sm:w-3.5"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#78350f" />
          <stop offset="42%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#fef3c7" />
        </linearGradient>
      </defs>
      <path
        d="M13 4.5 4.8 0.6 4.8 2.9 0.6 2.9 0.6 6.1 4.8 6.1 4.8 8.4Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M13 4.5 4.8 0.6 4.8 2.9 0.6 2.9 0.6 3.8 4.8 2.9 4.8 0.6Z"
        fill="rgba(255,255,255,0.28)"
      />
    </svg>
  )
}

type LigaTowerProps = {
  ligaXp?: number
  ligaXpMax?: number
  currentTierId?: LigaTierId
  avatarGender?: AvatarGender
}

export default function LigaTower({
  ligaXp = 0,
  ligaXpMax = LIGA_XP_MAX,
  currentTierId = 'recruit',
  avatarGender = 'male',
}: LigaTowerProps) {
  const tiersBottomToTop = [...LIGA_TIERS]
  const progressXp = clampLigaXp(ligaXp)
  const maxXp = ligaXpMax > 0 ? ligaXpMax : LIGA_XP_MAX
  const progressFraction = getLigaProgressFraction(progressXp, maxXp)
  const progressLineBottomPercent = getLigaProgressLineBottomPercent(
    progressXp,
    currentTierId,
    maxXp,
  )
  const verticalFill = getLigaVerticalFillPercents(progressXp, currentTierId, maxXp)
  const nextTierId = getNextLigaTierId(currentTierId)
  const progressLabel = `${progressXp}/${maxXp}`
  const textColumnRef = useRef<HTMLDivElement>(null)
  const [textColumnHeight, setTextColumnHeight] = useState<number | null>(null)
  const arrowGradientId = useId().replace(/:/g, '')

  useLayoutEffect(() => {
    const element = textColumnRef.current
    if (!element) return

    const updateHeight = () => {
      setTextColumnHeight(element.getBoundingClientRect().height)
    }

    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(element)
    return () => observer.disconnect()
  }, [progressLabel, avatarGender])

  const columnHeightStyle =
    textColumnHeight != null ? { height: `${textColumnHeight}px` } : undefined

  return (
    <div className="flex w-full gap-3 sm:gap-4">
      <div
        className="flex shrink-0 items-center justify-center pb-8 pt-2"
        aria-hidden
      >
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 [writing-mode:vertical-rl] rotate-180 dark:text-slate-400">
          XP
        </p>
      </div>

      <div className="flex flex-1 items-start gap-2 sm:gap-3">
        <div
          className="relative w-1.5 shrink-0 self-start overflow-hidden rounded-full bg-slate-200/90 shadow-inner dark:bg-slate-700/80 sm:w-2"
          style={columnHeightStyle}
          aria-hidden
        >
          {progressXp > 0 ? (
            <div
              className="absolute left-0 right-0 rounded-full bg-gradient-to-t from-amber-700/90 via-yellow-400/95 to-amber-100"
              style={{
                bottom: `${verticalFill.bottomPercent}%`,
                height: `${verticalFill.heightPercent}%`,
              }}
            />
          ) : null}
        </div>

        <div
          className="relative flex min-h-0 flex-1 items-start gap-2 sm:gap-3"
          style={columnHeightStyle}
        >
          <div
            className="relative flex w-12 shrink-0 flex-col self-start overflow-hidden rounded-xl border-2 border-slate-300/80 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.25)] dark:border-slate-600 sm:w-14"
            style={columnHeightStyle}
            role="img"
            aria-label={`Liga-Fortschritt: ${progressLabel} von ${maxXp} Liga-XP (${Math.round(progressFraction * 100)} % im aktuellen Liga-Bereich)`}
          >
            {[...tiersBottomToTop].reverse().map((tier) => (
              <div
                key={tier.id}
                className={`${TIER_FLEX_CLASS[tier.id] ?? 'flex-1'} ${tier.barClass}`}
              />
            ))}
          </div>

          {progressXp > 0 ? (
            <>
              <div
                className="pointer-events-none absolute bottom-0 left-[calc(-0.5rem-6px)] right-[-0.65rem] z-[8] bg-gradient-to-t from-emerald-300/70 via-green-200/50 to-transparent sm:left-[calc(-0.75rem-8px)] sm:right-[-0.85rem] dark:from-emerald-500/50 dark:via-green-500/30"
                style={{ height: `${progressLineBottomPercent}%` }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute left-[calc(-0.5rem-6px)] right-[-0.65rem] z-10 sm:left-[calc(-0.75rem-8px)] sm:right-[-0.85rem]"
                style={{ bottom: `${progressLineBottomPercent}%` }}
                aria-hidden
              >
                <div className="relative w-full">
                  <div
                    className="absolute left-0 right-0 top-0 h-[2px] -translate-y-1/2 rounded-full shadow-[0_0_5px_rgba(251,191,36,0.7)] dark:bg-[linear-gradient(90deg,#fef9c3_0%,#fde68a_6%,#fbbf24_18%,#d97706_30%,#b45309_34%,#fbbf24_46%,#fde68a_68%,#fffbeb_100%)]"
                    style={{ background: LIGA_HORIZONTAL_GOLD_GRADIENT }}
                  />
                  <div className="absolute top-0 left-0 -translate-x-[calc(100%+6px)] -translate-y-1/2 sm:-translate-x-[calc(100%+8px)]">
                    <div className="lifexp-liga-progress-arrow">
                      <LigaProgressArrow gradientId={arrowGradientId} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          <div
            ref={textColumnRef}
            className="relative z-20 flex min-w-0 flex-1 flex-col gap-1 py-0.5"
          >
          {[...tiersBottomToTop].reverse().map((tier) => {
            const isCurrent = tier.id === currentTierId
            const isNext = nextTierId !== null && tier.id === nextTierId
            return (
              <div
                key={tier.id}
                className={`relative flex min-h-[2.5rem] shrink-0 flex-col justify-center rounded-xl border px-2.5 py-1.5 sm:px-3 ${
                  isCurrent
                    ? 'border-sky-400/90 bg-gradient-to-r from-sky-50 to-white shadow-sm dark:border-sky-500/80 dark:from-sky-950/55 dark:to-slate-900/80'
                    : 'border-transparent bg-slate-100/95 dark:bg-slate-900/90'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-1.5">
                  <div className="flex min-w-0 flex-wrap items-center gap-1">
                    {tier.medal ? (
                      <span
                        className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                          tier.id === 'gold'
                            ? 'border-amber-400/70 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900 dark:from-amber-950/80 dark:to-yellow-950/50 dark:text-amber-100'
                            : tier.id === 'silver'
                              ? 'border-slate-400/60 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 dark:from-slate-800 dark:to-slate-700 dark:text-slate-100'
                              : 'border-amber-700/40 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-950 dark:from-amber-950/50 dark:to-orange-950/40 dark:text-amber-100'
                        }`}
                      >
                        {tier.medal}
                      </span>
                    ) : null}
                    {isCurrent ? (
                      <span className="rounded-md bg-sky-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white dark:bg-sky-600">
                        Aktuelle Liga
                      </span>
                    ) : null}
                    {isNext ? (
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                        Nächste Liga
                      </span>
                    ) : null}
                  </div>
                  {isCurrent ? (
                    <span className="shrink-0 text-[10px] font-bold tabular-nums text-sky-800 dark:text-sky-200">
                      {progressLabel}
                    </span>
                  ) : null}
                </div>
                <p className={`text-sm font-bold leading-snug sm:text-[0.95rem] ${tier.labelClass}`}>
                  {getLigaTierTitle(tier.id, avatarGender)}
                </p>
              </div>
            )
          })}
          </div>
        </div>
      </div>
    </div>
  )
}
