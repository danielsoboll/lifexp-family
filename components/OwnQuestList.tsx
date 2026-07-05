'use client'

import { useEffect, useMemo, useState } from 'react'

import { notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import ProgressBar from './ProgressBar'
import { cetToday } from '../lib/cetDate'
import { completeQuestForChild, completeQuestForParent } from '../lib/family/questCompletions'
import { markPlusDiscoverUnlocked } from '../lib/family/plusDiscoverUnlock'
import { fetchQuestsWithCompletions, questAppliesToMember } from '../lib/family/quests'
import type { QuestWithCompletion } from '../lib/family/types'
import { formatParentDisplayName } from '../lib/family/familyDisplayName'
import { CARD_SURFACE_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

export default function OwnQuestList() {
  const { family, parent, activeChild, memberKind } = useFamily()
  const [quests, setQuests] = useState<QuestWithCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyQuestId, setBusyQuestId] = useState<string | null>(null)

  const memberType = memberKind === 'child' ? 'child' : 'parent'
  const memberId = memberKind === 'child' ? activeChild?.id : parent?.id

  useEffect(() => {
    if (!family || !memberId) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      const { quests: rows, error: fetchError } = await fetchQuestsWithCompletions(family.id)
      if (cancelled) return
      setLoading(false)
      if (fetchError) {
        setError(fetchError.message)
        return
      }
      setError(null)
      setQuests(rows.filter((q) => questAppliesToMember(q.child_id, q.assignees, memberType, memberId)))
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [family?.id, memberId, memberType])

  const completedCount = useMemo(() => {
    if (!memberId) return 0
    return quests.filter((q) =>
      memberType === 'parent'
        ? q.completionParentIds.includes(memberId)
        : q.completionChildIds.includes(memberId),
    ).length
  }, [quests, memberId, memberType])

  const progress = quests.length > 0 ? Math.round((completedCount / quests.length) * 100) : 0

  if (!family || !memberId) return null

  const complete = async (quest: QuestWithCompletion) => {
    setBusyQuestId(quest.id)

    const completeError =
      memberType === 'parent' && parent
        ? (
            await completeQuestForParent({
              quest,
              parentId: parent.id,
              familyId: family.id,
              entryDate: cetToday(),
            })
          ).error
        : activeChild
          ? (
              await completeQuestForChild({
                quest,
                childId: activeChild.id,
                familyId: family.id,
                entryDate: cetToday(),
              })
            ).error
          : new Error('Profil nicht gefunden.')

    setBusyQuestId(null)
    if (completeError) {
      setError(completeError.message)
      return
    }

    markPlusDiscoverUnlocked(family.id)
    notifyFamilyDataChanged()
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id !== quest.id) return q
        if (memberType === 'parent') {
          return { ...q, completionParentIds: [...q.completionParentIds, memberId] }
        }
        return { ...q, completionChildIds: [...q.completionChildIds, memberId] }
      }),
    )
  }

  if (loading) {
    return <p className="text-sm text-slate-950 dark:text-slate-400">Quests werden geladen …</p>
  }

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        {error}
      </p>
    )
  }

  if (quests.length === 0) {
    return (
      <p className="text-sm text-slate-950 dark:text-slate-400">Dir sind noch keine Quests zugewiesen.</p>
    )
  }

  const displayName =
    memberType === 'parent' && parent
      ? formatParentDisplayName(parent.display_name, parent.gender)
      : activeChild?.display_name

  return (
    <div className="space-y-4">
      <div className={`${CARD_SURFACE_CLASS} rounded-2xl p-4`}>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{displayName ?? 'Du'}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {completedCount} von {quests.length} Quests heute erledigt
        </p>
        <div className="mt-3">
          <ProgressBar progress={progress} />
        </div>
      </div>

      <div className="space-y-3">
        {quests.map((quest) => {
          const done =
            memberType === 'parent'
              ? quest.completionParentIds.includes(memberId)
              : quest.completionChildIds.includes(memberId)

          return (
            <article key={quest.id} className={`${CARD_SURFACE_CLASS} rounded-2xl p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">{quest.title}</h3>
                  {quest.description ? (
                    <p className="mt-1 text-sm text-slate-950 dark:text-slate-400">{quest.description}</p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                  +{quest.xp_reward} XP
                </span>
              </div>
              <button
                type="button"
                disabled={done || busyQuestId === quest.id}
                onClick={() => void complete(quest)}
                className={`${PRESSABLE_3D_CLASS} mt-3 w-full rounded-xl border-2 px-3 py-2 text-sm font-bold disabled:opacity-60 ${
                  done
                    ? 'border-stone-300 bg-stone-100 text-stone-600 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300'
                    : 'border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 text-white'
                }`}
              >
                {done ? 'Erledigt' : busyQuestId === quest.id ? 'Speichern …' : 'Als erledigt markieren'}
              </button>
            </article>
          )
        })}
      </div>
    </div>
  )
}
