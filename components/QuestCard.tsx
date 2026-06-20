'use client'

import { useState } from 'react'

import { memberLabelForAssignee } from './MemberSingleSelect'
import type { ParentMember } from '../lib/family/members'
import type { ChildWithTodayXp, QuestAssignee, QuestWithCompletion } from '../lib/family/types'
import { isQuestCompletedForAssignee, questPrimaryAssignee } from '../lib/family/quests'
import { formatQuestDayLabel } from '../lib/family/questRules'
import { formatParentDisplayName } from '../lib/family/familyDisplayName'
import { cetToday, normalizeDateKey } from '../lib/cetDate'
import { completeQuestForChild, completeQuestForParent } from '../lib/family/questCompletions'
import { CARD_SURFACE_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

type QuestCardProps = {
  quest: QuestWithCompletion
  children: ChildWithTodayXp[]
  parents?: ParentMember[]
  familyId: string
  sessionMember: QuestAssignee | null
  onCompleted?: () => void
}

function creatorLabel(
  quest: QuestWithCompletion,
  parents: ParentMember[],
  children: ChildWithTodayXp[],
): string {
  if (quest.created_by_child_id) {
    const child = children.find((c) => c.id === quest.created_by_child_id)
    return child?.display_name ?? 'Kind'
  }
  if (quest.created_by) {
    const parent = parents.find((p) => p.id === quest.created_by)
    return parent ? formatParentDisplayName(parent.display_name, parent.gender) : 'Erwachsene'
  }
  return 'Familie'
}

export default function QuestCard({
  quest,
  children,
  parents = [],
  familyId,
  sessionMember,
  onCompleted,
}: QuestCardProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const assignee = questPrimaryAssignee(quest)
  const assigneeName = assignee ? memberLabelForAssignee(assignee, parents, children) : '—'
  const done = isQuestCompletedForAssignee(quest)
  const dayLabel = formatQuestDayLabel(quest.task_date)
  const isToday = normalizeDateKey(quest.task_date) === cetToday()
  const canComplete =
    !done &&
    isToday &&
    assignee &&
    sessionMember &&
    sessionMember.type === assignee.type &&
    sessionMember.id === assignee.id

  const complete = async () => {
    if (!assignee || !canComplete) return
    setBusy(true)
    setError(null)

    const completeError =
      assignee.type === 'parent'
        ? (
            await completeQuestForParent({
              quest,
              parentId: assignee.id,
              familyId,
            })
          ).error
        : (
            await completeQuestForChild({
              quest,
              childId: assignee.id,
              familyId,
            })
          ).error

    setBusy(false)
    if (completeError) {
      setError(completeError.message)
      return
    }
    onCompleted?.()
  }

  return (
    <article className={`${CARD_SURFACE_CLASS} rounded-2xl p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              {dayLabel}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                done
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                  : 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
              }`}
            >
              {done ? 'Erledigt' : 'Offen'}
            </span>
          </div>
          <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{quest.title}</h3>
          {quest.description ? (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{quest.description}</p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
          +{quest.xp_reward} XP
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Für <strong className="text-slate-700 dark:text-slate-200">{assigneeName}</strong> · eingetragen von{' '}
        <strong className="text-slate-700 dark:text-slate-200">{creatorLabel(quest, parents, children)}</strong>
      </p>

      {canComplete ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void complete()}
          className={`${PRESSABLE_3D_CLASS} mt-4 w-full rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60`}
        >
          {busy ? 'Speichern …' : 'Als erledigt markieren'}
        </button>
      ) : null}

      {!done && !isToday ? (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Erst am geplanten Tag erledigbar.</p>
      ) : null}

      {error ? (
        <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
    </article>
  )
}
