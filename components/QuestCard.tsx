'use client'

import type { ChildWithTodayXp, QuestWithCompletion } from '../lib/family/types'
import { CARD_SURFACE_CLASS } from '../lib/appShell'
import QuestCompleteButton from './QuestCompleteButton'

type QuestCardProps = {
  quest: QuestWithCompletion
  children: ChildWithTodayXp[]
  familyId: string
  onCompleted?: () => void
}

const RECURRENCE_LABEL = {
  once: 'Einmalig',
  daily: 'Täglich',
  weekly: 'Wöchentlich',
} as const

export default function QuestCard({ quest, children, familyId, onCompleted }: QuestCardProps) {
  const applicableChildren = children.filter((child) => quest.child_id === null || quest.child_id === child.id)

  return (
    <article className={`${CARD_SURFACE_CLASS} rounded-2xl p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{quest.title}</h3>
          {quest.description ? (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{quest.description}</p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
          +{quest.xp_reward} XP
        </span>
      </div>
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {quest.category} · {RECURRENCE_LABEL[quest.recurrence]}
        {quest.child_id ? ' · Ein Kind' : ' · Alle Kinder'}
      </p>
      <div className="mt-4 space-y-2">
        {applicableChildren.length === 0 ? (
          <p className="text-sm text-slate-500">Kein passendes Kinderprofil.</p>
        ) : (
          applicableChildren.map((child) => (
            <QuestCompleteButton
              key={`${quest.id}-${child.id}`}
              quest={quest}
              childId={child.id}
              childName={child.display_name}
              familyId={familyId}
              disabled={quest.completionChildIds.includes(child.id)}
              onCompleted={onCompleted}
            />
          ))
        )}
      </div>
    </article>
  )
}
