'use client'

import { portraitSrc, type AvatarPortraitId } from '../lib/family/memberAvatar'

type RoundPortraitReactionProps = {
  portraitId: AvatarPortraitId
  sizeClass?: string
  className?: string
}

/** Runder Gesichts-Ausschnitt (oberer Bildbereich) — größer als Emoji. */
export default function RoundPortraitReaction({
  portraitId,
  sizeClass = 'h-11 w-11',
  className = '',
}: RoundPortraitReactionProps) {
  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-full border-2 border-emerald-500 bg-slate-100 shadow-sm dark:border-emerald-400 dark:bg-slate-800 ${sizeClass} ${className}`.trim()}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={portraitSrc(portraitId)}
        alt=""
        className="h-[145%] w-full object-cover object-top"
      />
    </span>
  )
}
