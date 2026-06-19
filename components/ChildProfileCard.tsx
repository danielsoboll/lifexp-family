import Link from 'next/link'

import { getLevel, getProgressPercent, getXpRemainingToNextLevel } from '../lib/level'
import type { ChildWithTodayXp } from '../lib/family/types'
import { CARD_SURFACE_CLASS } from '../lib/appShell'
import ProgressBar from './ProgressBar'

function avatarGenderForChild(child: ChildWithTodayXp): 'male' | 'female' {
  if (child.avatar_key === 'girl' || child.avatar_key === 'female') return 'female'
  return 'male'
}

type ChildProfileCardProps = {
  child: ChildWithTodayXp
  href?: string
}

export default function ChildProfileCard({ child, href }: ChildProfileCardProps) {
  const level = getLevel(child.total_xp)
  const progress = getProgressPercent(child.total_xp)
  const remaining = getXpRemainingToNextLevel(child.total_xp)
  const gender = avatarGenderForChild(child)

  const content = (
    <article className={`${CARD_SURFACE_CLASS} rounded-2xl p-4 transition hover:border-emerald-400/80`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{child.display_name}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Level {level} · {child.total_xp} XP gesamt
          </p>
        </div>
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-200 to-slate-100 text-2xl dark:from-emerald-900/60 dark:to-emerald-950/40"
          aria-hidden
        >
          {gender === 'female' ? '👧' : '👦'}
        </span>
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
