import Link from 'next/link'

import { getLevel, getProgressPercent, getXpRemainingToNextLevel } from '../lib/level'
import { resolveChildAvatar } from '../lib/family/memberAvatar'
import { childGenderForAvatar, formatChildAge } from '../lib/family/memberGender'
import type { ChildWithTodayXp } from '../lib/family/types'
import { CARD_SURFACE_CLASS } from '../lib/appShell'
import ProgressBar from './ProgressBar'

type ChildProfileCardProps = {
  child: ChildWithTodayXp
  href?: string
}

export default function ChildProfileCard({ child, href }: ChildProfileCardProps) {
  const level = getLevel(child.total_xp)
  const progress = getProgressPercent(child.total_xp)
  const remaining = getXpRemainingToNextLevel(child.total_xp)
  const ageLabel = formatChildAge(child.age)
  const avatar = resolveChildAvatar(child.gender, child.age, child.portrait_id, {
    todayXp: child.todayXp,
  })

  const content = (
    <article className={`${CARD_SURFACE_CLASS} rounded-2xl p-4 transition hover:border-emerald-400/80`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{child.display_name}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {ageLabel ? `${ageLabel} · ` : ''}Level {level} · {child.total_xp} XP gesamt
          </p>
        </div>
        {avatar.src ? (
          <div className="h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatar.src} alt="" className="h-full w-full object-cover object-top" />
          </div>
        ) : (
          <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 px-1 text-center text-[10px] leading-tight text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {avatar.error ?? '—'}
          </div>
        )}
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span>Heute: +{child.todayXp} XP</span>
          <span>Noch {remaining} XP bis Level {level + 1}</span>
        </div>
        <ProgressBar progress={progress} compact />
      </div>
    </article>
  )

  if (href) {
    return (
      <Link href={href} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
        {content}
      </Link>
    )
  }

  return content
}

export { childGenderForAvatar }
