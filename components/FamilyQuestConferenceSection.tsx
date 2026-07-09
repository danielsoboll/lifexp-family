'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import AdminFamilyPersonalGoalXpSheet from './AdminFamilyPersonalGoalXpSheet'
import AdminPersonalGoalXpSheet from './AdminPersonalGoalXpSheet'
import QuestFinalConfirmButton from './QuestFinalConfirmButton'
import { FAMILY_DATA_CHANGED_EVENT, notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import { collectQuestsAwaitingConfirmation } from '../lib/family/familyQuestConference'
import {
  fetchFamilyPersonalGoalsAwaitingXpList,
  type FamilyPersonalGoal,
} from '../lib/family/familyPersonalGoals'
import {
  fetchFamilyPersonalGoalsAwaitingXp,
  type PersonalGoalAwaitingXpItem,
} from '../lib/family/personalGoals'
import { personalGoalSymbolEmoji } from '../lib/family/personalGoalSymbols'
import { QUEST_STATUS_BADGE_CLASS } from '../lib/family/questCardSurface'
import type { QuestWithCompletion } from '../lib/family/types'
import { CARD_SURFACE_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

type FamilyQuestConferenceSectionProps = {
  quests: QuestWithCompletion[]
  placement?: 'top' | 'bottom'
}

const AWAITING_CONFIRM_SURFACE_CLASS =
  'rounded-xl border-2 border-amber-500/90 bg-gradient-to-b from-yellow-100/90 via-amber-50/80 to-white px-3 py-2.5 dark:border-amber-500/75 dark:from-yellow-950/45 dark:via-amber-950/35 dark:to-slate-900/95'

export default function FamilyQuestConferenceSection({
  quests,
  placement = 'bottom',
}: FamilyQuestConferenceSectionProps) {
  const { family, parents, children, session, canAdmin } = useFamily()
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

  const awaitingConfirmations = useMemo(
    () =>
      collectQuestsAwaitingConfirmation({
        quests,
        session,
        canAdmin,
        parents,
        children,
      }),
    [quests, session, canAdmin, parents, children],
  )

  const hasMemberGoals = goalsAwaitingXp.length > 0
  const hasFamilyGoals = familyGoalsAwaitingXp.length > 0
  const hasGoals = hasMemberGoals || hasFamilyGoals
  const hasConfirmations = awaitingConfirmations.length > 0

  if (!family || loadingGoals) return null
  if (!hasGoals && !hasConfirmations) return null

  const sectionShellClass =
    placement === 'top'
      ? 'mb-6 scroll-mt-4 space-y-4'
      : 'mt-8 scroll-mt-4 space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700'

  const awaitingBadge = QUEST_STATUS_BADGE_CLASS.awaiting_creator

  return (
    <>
      <section id="familien-sitzung" aria-label="Familien-Sitzung" className={sectionShellClass}>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Familien-Sitzung</h2>
          <p className="mt-1 text-sm text-slate-950 dark:text-slate-400">Offene Entscheidungen.</p>
        </div>

        {hasGoals ? (
          <div className={`${CARD_SURFACE_CLASS} space-y-3 rounded-2xl p-4`}>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Ziele — XP vergeben</h3>
              <p className="mt-1 text-xs text-slate-950 dark:text-slate-400">
                Familie und Mitglieder haben Ziele eingetragen.
              </p>
            </div>
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
                        Familie · {goal.title}
                      </p>
                      <p className="mt-0.5 text-xs text-orange-800 dark:text-orange-300">Noch keine XP vergeben.</p>
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
                        Noch keine XP vergeben.
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
        ) : null}

        {hasConfirmations ? (
          <div className={`${CARD_SURFACE_CLASS} space-y-3 rounded-2xl p-4`}>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Bestätigung ausstehend</h3>
              <p className="mt-1 text-xs text-slate-950 dark:text-slate-400">
                Jemand hat erledigt gemeldet.
              </p>
            </div>
            <ul className="space-y-2.5">
              {awaitingConfirmations.map(({ quest, completion, assigneeName, dayLabel, canConfirm }) => (
                <li key={completion.id} className={AWAITING_CONFIRM_SURFACE_CLASS}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-950 dark:bg-slate-900/55 dark:text-slate-200">
                      {dayLabel}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${awaitingBadge.className}`}
                    >
                      {awaitingBadge.text}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                    <span className="text-amber-900 dark:text-amber-200">{assigneeName}</span>
                    <span className="font-normal text-slate-950 dark:text-slate-400"> · </span>
                    {quest.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-950 dark:text-slate-400">
                    {assigneeName} hat erledigt gemeldet.
                  </p>
                  <p className="mt-1 text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                    +{quest.xp_reward} XP
                  </p>
                  {canConfirm ? (
                    <QuestFinalConfirmButton
                      completionId={completion.id}
                      xpReward={quest.xp_reward}
                      assigneeName={assigneeName}
                      assigneeChildId={completion.childId}
                      assigneeParentId={completion.parentId}
                      compact
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
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
