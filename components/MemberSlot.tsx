import Link from 'next/link'

import MemberDailyXpBar from './MemberDailyXpBar'
import { CARD_SURFACE_CLASS } from '../lib/appShell'

type MemberSlotProps = {
  name: string
  todayXp?: number
  avatarSrc?: string | null
  avatarError?: string | null
  href?: string
  preview?: boolean
  highlightClass?: string
  setupGuideTarget?: string
}

export default function MemberSlot({
  name,
  todayXp = 0,
  avatarSrc,
  avatarError,
  href,
  preview = false,
  highlightClass = '',
  setupGuideTarget,
}: MemberSlotProps) {
  const visual = avatarError ? (
    <div className="flex aspect-[5/6] w-full items-center justify-center rounded-xl bg-slate-100 px-1 dark:bg-slate-800">
      <p className="text-[10px] leading-tight text-amber-800 dark:text-amber-200">{avatarError}</p>
    </div>
  ) : avatarSrc ? (
    <div className="relative aspect-[5/6] w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={avatarSrc} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
    </div>
  ) : (
    <div className="flex aspect-[5/6] w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
      <span className="text-xs text-slate-500 dark:text-slate-400">Kein Portrait</span>
    </div>
  )

  const inner = (
    <article
      data-setup-guide-target={setupGuideTarget}
      className={`${CARD_SURFACE_CLASS} flex flex-col items-center rounded-2xl p-2 text-center transition hover:border-emerald-400/80 ${highlightClass}`}
    >
      {visual}
      <div className="mt-1.5 w-full px-0.5">
        <MemberDailyXpBar todayXp={todayXp} />
      </div>
      <h3 className="mt-1 line-clamp-2 text-sm font-bold text-slate-900 dark:text-slate-100">{name}</h3>
    </article>
  )

  if (preview || !href) {
    return <div className="pointer-events-none opacity-90">{inner}</div>
  }

  return (
    <Link
      href={href}
      className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
    >
      {inner}
    </Link>
  )
}
