'use client'

import { useCallback, useEffect, useState } from 'react'

import AdminPersonalGoalXpSheet from './AdminPersonalGoalXpSheet'
import MemberPersonalGoalsSheet from './MemberPersonalGoalsSheet'
import { FAMILY_DATA_CHANGED_EVENT, notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'
import {
  fetchMemberPersonalGoals,
  memberCanEditPersonalGoals,
  countPersonalGoalsAwaitingXp,
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

function PersonalGoalListItem({
  goal,
  interactive,
  onSelect,
}: {
  goal: MemberPersonalGoal
  interactive: boolean
  onSelect?: () => void
}) {
  const hasXp = goal.targetXp !== null && goal.targetXp > 0
  const surfaceClass = hasXp
    ? 'border-emerald-600 bg-gradient-to-b from-emerald-50 to-emerald-100 dark:border-emerald-700 dark:from-emerald-950/50 dark:to-emerald-900/40'
    : 'border-orange-500 bg-gradient-to-b from-orange-50 to-orange-100 dark:border-orange-600 dark:from-orange-950/45 dark:to-orange-900/35'
  const titleClass = hasXp ? 'text-emerald-950 dark:text-emerald-100' : 'text-orange-950 dark:text-orange-100'
  const metaClass = hasXp ? 'text-emerald-800 dark:text-emerald-300' : 'text-orange-800 dark:text-orange-300'

  const content = (
    <>
      <span className="text-xl leading-none" aria-hidden>
        {personalGoalSymbolEmoji(goal.symbolId)}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold ${titleClass}`}>
          {goal.sortOrder}. {goal.title}
        </p>
        <p className={`text-xs ${metaClass}`}>
          {hasXp ? `${goal.progressXp}/${goal.targetXp} XP` : 'Noch keine XP vergeben'}
        </p>
      </div>
    </>
  )

  if (interactive && onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left ${surfaceClass}`}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 ${surfaceClass}`}>
      {content}
    </div>
  )
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
  const goalsAwaitingXp = countPersonalGoalsAwaitingXp(goals)
  const canEdit = memberCanEditPersonalGoals({ goals, isSelf, canAdmin, memberKind })
  const canManageAsAdmin = !isSelf && canAdmin
  const showSelfEditor = isSelf && canEdit
  const allGoalsHaveXp = goals.every((goal) => goal.targetXp !== null && goal.targetXp > 0)

  const xpGoal = xpGoalId ? goals.find((goal) => goal.id === xpGoalId) : null

  const buttonLabel = hasGoals ? 'Eigene Belohnungen' : 'Eigene Belohnung anlegen'
  const buttonClass = hasGoals
    ? `${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-400 to-emerald-700 px-4 py-3 text-sm font-bold text-white`
    : `${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 border-orange-500 bg-gradient-to-b from-orange-300 to-orange-500 px-4 py-3 text-sm font-bold text-orange-950`

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Belohnungen</h2>

      {loading ? (
        <p className="text-sm text-slate-950 dark:text-slate-400">Belohnungen werden geladen …</p>
      ) : null}

      {isSelf && goalsAwaitingXp > 0 ? (
        <div className="rounded-xl border-2 border-orange-400/80 bg-gradient-to-b from-orange-50 to-orange-100/80 px-3 py-2.5 dark:border-orange-700/70 dark:from-orange-950/40 dark:to-orange-900/25">
          <p className="text-sm font-bold text-orange-950 dark:text-orange-100">Deine Belohnung wartet</p>
          <p className="mt-1 text-xs leading-relaxed text-orange-900 dark:text-orange-200">
            Frag deine Familie, wie viele XP du für deine Belohnung sammeln musst.
          </p>
        </div>
      ) : null}

      {!loading && !isSelf && !hasGoals ? (
        <p className="text-sm text-slate-950 dark:text-slate-400">Noch keine eigenen Belohnungen eingetragen.</p>
      ) : null}

      {!loading && !isSelf && hasGoals && !canAdmin ? (
        <ul className="space-y-2">
          {goals.map((goal) => (
            <li key={goal.id}>
              <PersonalGoalListItem goal={goal} interactive={false} />
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && !isSelf && hasGoals && canAdmin ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-950 dark:text-slate-400">
            {allGoalsHaveXp ? 'Belohnungen' : 'Belohnungen — tippe, um XP zu vergeben (1–999)'}
          </p>
          <ul className="space-y-2">
            {goals.map((goal) => (
              <li key={goal.id}>
                <PersonalGoalListItem goal={goal} interactive onSelect={() => setXpGoalId(goal.id)} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!loading && isSelf && canEdit ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => setEditorOpen(true)}
          className={`${buttonClass} disabled:opacity-60`}
        >
          {buttonLabel}
        </button>
      ) : null}

      {!loading && canManageAsAdmin ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => setEditorOpen(true)}
          className={`${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-400 to-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-60`}
        >
          {hasGoals ? `Belohnungen für ${memberLabel}` : `Belohnung für ${memberLabel} anlegen`}
        </button>
      ) : null}

      {editorOpen && (showSelfEditor || canManageAsAdmin) ? (
        <MemberPersonalGoalsSheet
          familyId={family.id}
          member={member}
          memberLabel={memberLabel}
          goals={goals}
          isSelf={isSelf}
          canAdmin={canAdmin}
          readOnly={!canEdit}
          onClose={() => setEditorOpen(false)}
          onSaved={() => {
            void load()
            notifyFamilyDataChanged()
          }}
        />
      ) : null}

      {xpGoal && canAdmin && !isSelf ? (
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
