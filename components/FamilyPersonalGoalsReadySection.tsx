'use client'

import { useCallback, useEffect, useState } from 'react'

import PersonalGoalRedeemButton from './PersonalGoalRedeemButton'
import { FAMILY_DATA_CHANGED_EVENT, notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import {
  fetchFamilyPersonalGoalsReadyToRedeem,
  type PersonalGoalReadyToRedeemItem,
} from '../lib/family/personalGoals'
import { personalGoalSymbolEmoji } from '../lib/family/personalGoalSymbols'
import { CARD_SURFACE_CLASS } from '../lib/appShell'

const reachedSurfaceClass =
  'rounded-xl border-2 border-emerald-500/90 bg-gradient-to-b from-emerald-50/95 via-emerald-50/80 to-white px-3 py-2.5 dark:border-emerald-600/75 dark:from-emerald-950/45 dark:via-emerald-950/35 dark:to-slate-900/95'

export default function FamilyPersonalGoalsReadySection() {
  const { family, parents, children, session } = useFamily()
  const [goalsReadyToRedeem, setGoalsReadyToRedeem] = useState<PersonalGoalReadyToRedeemItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadGoals = useCallback(async () => {
    if (!family) return
    setLoading(true)
    const readyToRedeem = await fetchFamilyPersonalGoalsReadyToRedeem(family.id, parents, children)
    setLoading(false)
    if (!readyToRedeem.error) setGoalsReadyToRedeem(readyToRedeem.items)
  }, [family, parents, children])

  useEffect(() => {
    void loadGoals()
  }, [loadGoals])

  useEffect(() => {
    const refresh = () => void loadGoals()
    window.addEventListener(FAMILY_DATA_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(FAMILY_DATA_CHANGED_EVENT, refresh)
  }, [loadGoals])

  if (!family || loading || goalsReadyToRedeem.length === 0) return null

  return (
    <section aria-label="Belohnung erreicht" className="mb-6 space-y-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Belohnung erreicht</h2>
        <p className="mt-1 text-sm text-slate-950 dark:text-slate-400">
          Ziel-XP gesammelt — nur das Mitglied selbst kann „Erledigt“ tippen.
        </p>
      </div>
      <div className={`${CARD_SURFACE_CLASS} space-y-2 rounded-2xl p-4`}>
        <ul className="space-y-2">
          {goalsReadyToRedeem.map((item) => {
            const isSelf =
              session?.memberKind === item.memberKind && session.memberId === item.memberId
            return (
              <li key={item.goal.id} className={reachedSurfaceClass}>
                <div className="flex items-start gap-3">
                  <span className="text-xl leading-none" aria-hidden>
                    {personalGoalSymbolEmoji(item.goal.symbolId)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                      {item.memberLabel} hat sein Ziel erreicht: {item.goal.title}
                    </p>
                    <p className="mt-0.5 text-xs font-bold tabular-nums text-emerald-800 dark:text-emerald-300">
                      {item.goal.progressXp}/{item.goal.targetXp} XP
                    </p>
                  </div>
                </div>
                {isSelf ? (
                  <PersonalGoalRedeemButton
                    familyId={family.id}
                    memberKind={item.memberKind}
                    memberId={item.memberId}
                    goalId={item.goal.id}
                    compact
                    onRedeemed={() => {
                      void loadGoals()
                      notifyFamilyDataChanged()
                    }}
                  />
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
