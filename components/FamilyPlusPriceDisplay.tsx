'use client'

import {
  FAMILY_PLUS_PRICE_AMOUNT,
  FAMILY_PLUS_PRICE_PERIOD,
  FAMILY_PLUS_PRICE_TAGLINE,
} from '../lib/family/familyPlusFeatures'

type FamilyPlusPriceDisplayProps = {
  /** hero = großer Preis-Block; inline = schmaler Streifen neben CTA */
  variant?: 'hero' | 'inline'
  className?: string
}

export default function FamilyPlusPriceDisplay({
  variant = 'hero',
  className = '',
}: FamilyPlusPriceDisplayProps) {
  if (variant === 'inline') {
    return (
      <div
        className={`flex items-center justify-between gap-3 rounded-xl border-2 border-amber-400/90 bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100/80 px-3.5 py-2.5 dark:border-amber-600/70 dark:from-amber-950/55 dark:via-amber-950/35 dark:to-amber-900/45 ${className}`}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800/90 dark:text-amber-300/90">
            LifeXP Family PLUS
          </p>
          <p className="text-xs font-semibold text-amber-950/85 dark:text-amber-100/85">{FAMILY_PLUS_PRICE_TAGLINE}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-extrabold tabular-nums leading-none tracking-tight text-amber-950 dark:text-amber-50">
            {FAMILY_PLUS_PRICE_AMOUNT}
          </p>
          <p className="mt-0.5 text-xs font-bold text-amber-900/90 dark:text-amber-200/90">{FAMILY_PLUS_PRICE_PERIOD}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`rounded-2xl border-2 border-amber-400/95 bg-gradient-to-b from-amber-100 via-amber-50/95 to-white px-4 py-3 text-center shadow-[0_4px_16px_-8px_rgba(217,119,6,0.4)] ring-1 ring-amber-300/40 dark:border-amber-600/80 dark:from-amber-950/60 dark:via-amber-950/40 dark:to-amber-950/20 dark:ring-amber-700/30 ${className}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800/90 dark:text-amber-300/90">
        LifeXP Family PLUS
      </p>
      <div className="mt-1 flex items-baseline justify-center gap-1">
        <span className="text-[1.75rem] font-extrabold tabular-nums leading-none tracking-tight text-amber-950 dark:text-amber-50">
          {FAMILY_PLUS_PRICE_AMOUNT}
        </span>
        <span className="pb-0.5 text-sm font-bold text-amber-900/90 dark:text-amber-200/90">/ Monat</span>
      </div>
      <p className="mt-1 text-sm font-bold text-amber-950/90 dark:text-amber-100/90">{FAMILY_PLUS_PRICE_TAGLINE}</p>
    </div>
  )
}
