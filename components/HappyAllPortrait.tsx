'use client'

import { HAPPY_ALL_2_PORTRAIT_SRC, HAPPY_ALL_PORTRAIT_SRC } from '../lib/family/dailyXpDisplay'

/** Etwas unter object-top — unten etwas mehr Bild (Füße), oben minimal weniger. */
const HAPPY_ALL_OBJECT_POSITION_CLASS = 'object-[center_18%]'

type HappyAllPortraitProps = {
  className?: string
  /** Onboarding-Vorschau: alle 2 s zwischen Happy_all und Happy_all_2 wechseln. */
  cycle?: boolean
  /** Von außen gesteuert — sync mit Familienmitgliedern in der Vorschau. */
  showAlternate?: boolean
}

export default function HappyAllPortrait({
  className = '',
  cycle = false,
  showAlternate: showAlternateProp,
}: HappyAllPortraitProps) {
  const showAlternate = cycle ? (showAlternateProp ?? false) : false

  const imageClass = `absolute inset-0 h-full w-full object-cover ${HAPPY_ALL_OBJECT_POSITION_CLASS} transition-opacity duration-700 ease-in-out`

  return (
    <div
      className={`relative aspect-[5/4] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 ${className}`.trim()}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HAPPY_ALL_PORTRAIT_SRC}
        alt=""
        className={`${imageClass} ${showAlternate ? 'opacity-0' : 'opacity-100'}`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HAPPY_ALL_2_PORTRAIT_SRC}
        alt=""
        className={`${imageClass} ${showAlternate ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}
