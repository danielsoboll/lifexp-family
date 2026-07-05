'use client'

import { useCallback, useEffect, useState } from 'react'

import AdminPersonalGoalXpSheet from './AdminPersonalGoalXpSheet'
import MemberPersonalGoalsSheet from './MemberPersonalGoalsSheet'
import { FAMILY_DATA_CHANGED_EVENT, notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'
import {
  fetchMemberPersonalGoals,
  memberCanEditPersonalGoals,
  memberHasLockedPersonalGoals,
  type MemberPersonalGoal,
} from '../lib/family/personalGoals'
import { personalGoalSymbolEmoji } from '../lib/family/personalGoalSymbols'
import type { MemberXpHistoryKey } from '../lib/family/xpHistory'

type MemberPersonalGoalsPanelProps = {
  memberKind: 'parent' | 'child'
  memberId: string
  memberLabel: string
  isSelf: boolean
  editorOpen?: boolean
  onEditorOpenChange?: (open: boolean) => void
}

export default function MemberPersonalGoalsPanel({
  memberKind,
  memberId,
  memberLabel,
  isSelf,
  editorOpen: editorOpenProp,
  onEditorOpenChange,
}: MemberPersonalGoalsPanelProps) {
  const { family, canAdmin } = useFamily()
  const [goals, setGoals] = useState<MemberPersonalGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpenInternal, setEditorOpenInternal] = useState(false)
  const [xpGoalId, setXpGoalId] = useState<string | null>(null)

  const editorOpen = editorOpenProp ?? editorOpenInternal
  const setEditorOpen = onEditorOpenChange ?? setEditorOpenInternal

  const member: MemberXpHistoryKey = { memberKind, memberId }

  const load = useCallback(async () => {
    if (!family) return
    setLoading(true)
    const { goals: rows, error } = await fetchMemberPersonalGoals(family.id, member)
    setLoading(false)
    if (!error) setGoals(rows)
  }, [family, memberKind, memberId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const refresh = () => void load()
    window.addEventListener(FAMILY_DATA_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(FAMILY_DATA_CHANGED_EVENT, refresh)
  }, [load])

  if (!family) return null

  const hasGoals = goals.length > 0
  const locked = memberHasLockedPersonalGoals(goals)
  const canEdit = memberCanEditPersonalGoals({ goals, isSelf, canAdmin })
  const showButton = isSelf || canAdmin

  if (!showButton && !hasGoals) return null

  const xpGoal = xpGoalId ? goals.find((goal) => goal.id === xpGoalId) : null
  const allGoalsHaveXp = goals.every((goal) => goal.targetXp !== null && goal.targetXp > 0)

  const buttonLabel = hasGoals ? 'Eigene Ziele' : 'Eigene Ziele anlegen'
  const buttonClass = hasGoals
    ? `${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-400 to-emerald-700 px-4 py-3 text-sm font-bold text-white`
    : `${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 border-orange-500 bg-gradient-to-b from-orange-300 to-orange-500 px-4 py-3 text-sm font-bold text-orange-950`

  return (
    <section className="space-y-3">
      {canAdmin && hasGoals ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-950 dark:text-slate-400">
            {allGoalsHaveXp ? 'Ziele' : 'Ziele — tippe, um XP zu vergeben (1–999)'}
          </p>
          <ul className="space-y-2">
            {goals.map((goal) => {
              const hasXp = goal.targetXp !== null && goal.targetXp > 0
              return (
              <li key={goal.id}>
                <button
                  type="button"
                  onClick={() => setXpGoalId(goal.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left ${
                    hasXp
                      ? 'border-emerald-600 bg-gradient-to-b from-emerald-50 to-emerald-100 dark:border-emerald-700 dark:from-emerald-950/50 dark:to-emerald-900/40'
                      : 'border-orange-500 bg-gradient-to-b from-orange-50 to-orange-100 dark:border-orange-600 dark:from-orange-950/45 dark:to-orange-900/35'
                  }`}
                >
                  <span className="text-xl leading-none" aria-hidden>
                    {personalGoalSymbolEmoji(goal.symbolId)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-bold ${
                        hasXp ? 'text-emerald-950 dark:text-emerald-100' : 'text-orange-950 dark:text-orange-100'
                      }`}
                    >
                      {goal.sortOrder}. {goal.title}
                    </p>
                    <p
                      className={`text-xs ${
                        hasXp
                          ? 'text-emerald-800 dark:text-emerald-300'
                          : 'text-orange-800 dark:text-orange-300'
                      }`}
                    >
                      {hasXp ? `${goal.progressXp}/${goal.targetXp} XP` : 'Noch keine XP vergeben'}
                    </p>
                  </div>
                </button>
              </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {showButton ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => setEditorOpen(true)}
          className={`${buttonClass} disabled:opacity-60`}
        >
          {buttonLabel}
        </button>
      ) : null}

      {editorOpen ? (
        <MemberPersonalGoalsSheet
          familyId={family.id}
          member={member}
          memberLabel={memberLabel}
          goals={goals}
          isSelf={isSelf}
          canAdmin={canAdmin}
          readOnly={isSelf && locked && !canAdmin}
          onClose={() => setEditorOpen(false)}
          onSaved={() => {
            void load()
            notifyFamilyDataChanged()
          }}
        />
      ) : null}

      {xpGoal && canAdmin ? (
        <AdminPersonalGoalXpSheet
          familyId={family.id}
          member={member}
          memberLabel={memberLabel}
          goalId={xpGoal.id}
          goalTitle={xpGoal.title}
          currentTargetXp={xpGoal.targetXp}
          canAdmin={canAdmin}
          onClose={() => setXpGoalId(null)}
          onSaved={() => {
            void load()
            notifyFamilyDataChanged()
          }}
        />
      ) : null}
    </section>
  )
}
