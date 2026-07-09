'use client'

import { useCallback, useEffect, useState } from 'react'

import AdminFamilyPersonalGoalXpSheet from './AdminFamilyPersonalGoalXpSheet'
import AdminPersonalGoalXpSheet from './AdminPersonalGoalXpSheet'
import { FAMILY_DATA_CHANGED_EVENT, notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import {
  fetchFamilyPersonalGoalsAwaitingXpList,
  type FamilyPersonalGoal,
} from '../lib/family/familyPersonalGoals'
import {
  fetchFamilyPersonalGoalsAwaitingXp,
  type PersonalGoalAwaitingXpItem,
} from '../lib/family/personalGoals'
import { personalGoalSymbolEmoji } from '../lib/family/personalGoalSymbols'
import { CARD_SURFACE_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

type FamilyQuestConferenceSectionProps = {
  placement?: 'top' | 'bottom'
}

export default function FamilyQuestConferenceSection({
  placement = 'bottom',
}: FamilyQuestConferenceSectionProps) {
  const { family, parents, children, canAdmin } = useFamily()
  const [goalsAwaitingXp, setGoalsAwaitingXp] = useState<PersonalGoalAwaitingXpItem[]>([])
  const [familyGoalsAwaitingXp, setFamilyGoalsAwaitingXp] = useState<FamilyPersonalGoal[]>([])
  const [loadingGoals, setLoadingGoals] = useState(true)
  const [xpGoal, setXpGoal] = useState<PersonalGoalAwaitingXpItem | null>(null)
  const [familyXpGoal, setFamilyXpGoal] = useState<FamilyPersonalGoal | null>(null)

  const loadGoals = useCallback(async () => {
    if (!family) return
    setLoadingGoals(true)
    const [{ items, error }, familyAwaiting] = await Promise.all([
      fetchFamilyPersonalGoalsAwaitingXp(family.id, parents, children),
      fetchFamilyPersonalGoalsAwaitingXpList(family.id),
    ])
    setLoadingGoals(false)
    if (!error) setGoalsAwaitingXp(items)
    if (!familyAwaiting.error) setFamilyGoalsAwaitingXp(familyAwaiting.goals)
  }, [family, parents, children])

  useEffect(() => {
    void loadGoals()
  }, [loadGoals])

  useEffect(() => {
    const refresh = () => void loadGoals()
    window.addEventListener(FAMILY_DATA_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(FAMILY_DATA_CHANGED_EVENT, refresh)
  }, [loadGoals])

  const hasMemberGoals = goalsAwaitingXp.length > 0
  const hasFamilyGoals = familyGoalsAwaitingXp.length > 0
  const hasGoals = hasMemberGoals || hasFamilyGoals

  if (!family || loadingGoals || !hasGoals) return null

  const sectionShellClass =
    placement === 'top'
      ? 'mb-6 scroll-mt-4 space-y-4'
      : 'mt-8 scroll-mt-4 space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700'

  return (
    <>
      <section id="familien-sitzung" aria-label="Familien-Sitzung" className={sectionShellClass}>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Familien-Sitzung</h2>
          <p className="mt-1 text-sm text-slate-950 dark:text-slate-400">
            Jemand hat eine persönliche Belohnung oder ein Familienziel eingetragen — die Familie muss festlegen,
            wie viele XP nötig sind.
          </p>
        </div>

        <div className={`${CARD_SURFACE_CLASS} space-y-3 rounded-2xl p-4`}>
          <ul className="space-y-2">
            {familyGoalsAwaitingXp.map((goal) => (
              <li
                key={goal.id}
                className="rounded-xl border-2 border-orange-400/80 bg-gradient-to-b from-orange-50 to-orange-100/80 px-3 py-2.5 dark:border-orange-700/70 dark:from-orange-950/40 dark:to-orange-900/25"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl leading-none" aria-hidden>
                    {personalGoalSymbolEmoji(goal.symbolId)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-orange-950 dark:text-orange-100">
                      Familienziel · {goal.title}
                    </p>
                    <p className="mt-0.5 text-xs text-orange-800 dark:text-orange-300">
                      Noch keine XP vergeben — muss bewertet werden.
                    </p>
                  </div>
                </div>
                {canAdmin ? (
                  <button
                    type="button"
                    onClick={() => setFamilyXpGoal(goal)}
                    className={`${PRESSABLE_3D_CLASS} mt-2.5 w-full rounded-xl border-2 border-orange-600 bg-gradient-to-b from-orange-400 to-orange-600 px-3 py-2 text-sm font-bold text-orange-950`}
                  >
                    XP vergeben
                  </button>
                ) : null}
              </li>
            ))}
            {goalsAwaitingXp.map((item) => (
              <li
                key={item.goal.id}
                className="rounded-xl border-2 border-orange-400/80 bg-gradient-to-b from-orange-50 to-orange-100/80 px-3 py-2.5 dark:border-orange-700/70 dark:from-orange-950/40 dark:to-orange-900/25"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl leading-none" aria-hidden>
                    {personalGoalSymbolEmoji(item.goal.symbolId)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-orange-950 dark:text-orange-100">
                      {item.memberLabel} · {item.goal.title}
                    </p>
                    <p className="mt-0.5 text-xs text-orange-800 dark:text-orange-300">
                      Persönliche Belohnung — noch keine XP vergeben.
                    </p>
                  </div>
                </div>
                {canAdmin ? (
                  <button
                    type="button"
                    onClick={() => setXpGoal(item)}
                    className={`${PRESSABLE_3D_CLASS} mt-2.5 w-full rounded-xl border-2 border-orange-600 bg-gradient-to-b from-orange-400 to-orange-600 px-3 py-2 text-sm font-bold text-orange-950`}
                  >
                    XP vergeben
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {familyXpGoal && canAdmin ? (
        <AdminFamilyPersonalGoalXpSheet
          familyId={family.id}
          familyName={family.name}
          goalId={familyXpGoal.id}
          goalTitle={familyXpGoal.title}
          currentTargetXp={familyXpGoal.targetXp}
          canAdmin={canAdmin}
          onClose={() => setFamilyXpGoal(null)}
          onSaved={() => {
            void loadGoals()
            notifyFamilyDataChanged()
          }}
        />
      ) : null}

      {xpGoal && canAdmin ? (
        <AdminPersonalGoalXpSheet
          familyId={family.id}
          member={{ memberKind: xpGoal.memberKind, memberId: xpGoal.memberId }}
          memberLabel={xpGoal.memberLabel}
          goalId={xpGoal.goal.id}
          goalTitle={xpGoal.goal.title}
          currentTargetXp={xpGoal.goal.targetXp}
          canAdmin={canAdmin}
          onClose={() => setXpGoal(null)}
          onSaved={() => {
            void loadGoals()
            notifyFamilyDataChanged()
          }}
        />
      ) : null}
    </>
  )
}
