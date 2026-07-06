'use client'

import { useCallback, useEffect, useState } from 'react'

import AdminFamilyPersonalGoalXpSheet from './AdminFamilyPersonalGoalXpSheet'
import FamilyPersonalGoalsSheet from './FamilyPersonalGoalsSheet'
import { FAMILY_DATA_CHANGED_EVENT, notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'
import {
  countFamilyPersonalGoalsAwaitingXp,
  familyCanEditPersonalGoals,
  familyHasLockedPersonalGoals,
  fetchFamilyPersonalGoals,
  type FamilyPersonalGoal,
} from '../lib/family/familyPersonalGoals'
import { personalGoalSymbolEmoji } from '../lib/family/personalGoalSymbols'

type FamilyPersonalGoalsPanelProps = {
  editorOpen?: boolean
  onEditorOpenChange?: (open: boolean) => void
  /** Nur Button — für kompakte Quests-Zeile */
  compact?: boolean
}

const GOAL_BUTTON_HAS_CLASS = `${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-400 to-emerald-700 px-4 py-3 text-sm font-bold text-white`

const GOAL_BUTTON_NEW_CLASS = `${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 border-orange-500 bg-gradient-to-b from-orange-300 to-orange-500 px-4 py-3 text-sm font-bold text-orange-950`

const GOAL_ENTRY_HAS_CLASS = `${PRESSABLE_3D_CLASS} flex w-full items-center gap-3 rounded-xl border-2 border-emerald-400/80 bg-gradient-to-b from-emerald-50/90 to-emerald-100/70 px-3.5 py-2.5 text-sm font-bold text-emerald-950 dark:border-emerald-700/70 dark:from-emerald-950/40 dark:to-emerald-900/30 dark:text-emerald-100`

const GOAL_ENTRY_NEW_CLASS = `${PRESSABLE_3D_CLASS} flex w-full items-center gap-3 rounded-xl border-2 border-orange-400/80 bg-gradient-to-b from-orange-50/95 to-orange-100/80 px-3.5 py-2.5 text-sm font-bold text-orange-950 dark:border-orange-700/70 dark:from-orange-950/40 dark:to-orange-900/30 dark:text-orange-100`

export default function FamilyPersonalGoalsPanel({
  editorOpen: editorOpenProp,
  onEditorOpenChange,
  compact = false,
}: FamilyPersonalGoalsPanelProps) {
  const { family, canAdmin } = useFamily()
  const [goals, setGoals] = useState<FamilyPersonalGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpenInternal, setEditorOpenInternal] = useState(false)
  const [xpGoalId, setXpGoalId] = useState<string | null>(null)

  const editorOpen = editorOpenProp ?? editorOpenInternal
  const setEditorOpen = onEditorOpenChange ?? setEditorOpenInternal

  const load = useCallback(async () => {
    if (!family) return
    setLoading(true)
    const { goals: rows, error } = await fetchFamilyPersonalGoals(family.id)
    setLoading(false)
    if (!error) setGoals(rows)
  }, [family])

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
  const locked = familyHasLockedPersonalGoals(goals)
  const goalsAwaitingXp = countFamilyPersonalGoalsAwaitingXp(goals)
  const canEdit = familyCanEditPersonalGoals({ goals, canAdmin })

  const xpGoal = xpGoalId ? goals.find((goal) => goal.id === xpGoalId) : null
  const allGoalsHaveXp = goals.every((goal) => goal.targetXp !== null && goal.targetXp > 0)

  const buttonLabel = hasGoals ? 'Familienziele' : 'Familienziele anlegen'
  const buttonClass = hasGoals ? GOAL_BUTTON_HAS_CLASS : GOAL_BUTTON_NEW_CLASS
  const entryButtonClass = hasGoals ? GOAL_ENTRY_HAS_CLASS : GOAL_ENTRY_NEW_CLASS

  const content = (
    <>
      {!compact && goalsAwaitingXp > 0 ? (
        <div className="rounded-xl border-2 border-orange-400/80 bg-gradient-to-b from-orange-50 to-orange-100/80 px-3 py-2.5 dark:border-orange-700/70 dark:from-orange-950/40 dark:to-orange-900/25">
          <p className="text-sm font-bold text-orange-950 dark:text-orange-100">Familienziel wartet</p>
          <p className="mt-1 text-xs leading-relaxed text-orange-900 dark:text-orange-200">
            Die für euer Ziel nötigen XP müssen von der Familie entschieden werden.
          </p>
        </div>
      ) : null}

      {!compact && canAdmin && hasGoals ? (
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

      <button
        type="button"
        disabled={loading}
        onClick={() => setEditorOpen(true)}
        className={`${compact ? entryButtonClass : buttonClass} disabled:opacity-60`}
        aria-label={buttonLabel}
      >
        {compact ? (
          <>
            <span className="text-lg leading-none" aria-hidden>
              🎯
            </span>
            <span className="min-w-0 flex-1 text-left">{buttonLabel}</span>
            <span className="shrink-0 text-xs font-semibold opacity-80" aria-hidden>
              ›
            </span>
          </>
        ) : (
          buttonLabel
        )}
      </button>

      {editorOpen ? (
        <FamilyPersonalGoalsSheet
          familyId={family.id}
          familyName={family.name}
          goals={goals}
          canAdmin={canAdmin}
          readOnly={locked && !canAdmin}
          onClose={() => setEditorOpen(false)}
          onSaved={() => {
            void load()
            notifyFamilyDataChanged()
          }}
        />
      ) : null}

      {xpGoal && canAdmin ? (
        <AdminFamilyPersonalGoalXpSheet
          familyId={family.id}
          familyName={family.name}
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
    </>
  )

  if (compact) return content

  return <section className="space-y-3">{content}</section>
}
