'use client'

import { useEffect, useMemo, useState } from 'react'

import MemberPortraitMini from './MemberPortraitMini'
import XpGoalVerticalBar, { HISTORY_TOTAL_XP_LABEL_CLASS } from './XpGoalVerticalBar'
import XpHistoryChart, { XpHistoryChartLegend } from './XpHistoryChart'
import { useFamily } from './FamilyProvider'
import { formatFamilyIdentityLabel } from '../lib/family/familyIdentity'
import { formatParentDisplayName } from '../lib/family/familyDisplayName'
import { resolveChildAvatar, resolveParentAvatar } from '../lib/family/memberAvatar'
import {
  DEFAULT_MEMBER_XP_GOAL_TARGET,
  fetchActiveMemberXpGoal,
  sumHistoryXp,
  type XpGoalPeriod,
} from '../lib/family/xpGoals'
import { fetchFamilyPersonalGoalBarState } from '../lib/family/familyPersonalGoals'
import { fetchMemberPersonalGoalBarState } from '../lib/family/personalGoals'
import { personalGoalSymbolEmoji } from '../lib/family/personalGoalSymbols'
import {
  familyHistoryStartDateFromCreatedAt,
  fetchFamilyXpHistory,
  fetchMemberXpHistoriesBatch,
  type XpHistoryDay,
} from '../lib/family/xpHistory'
import { cetToday } from '../lib/cetDate'
import { CARD_SURFACE_CLASS } from '../lib/appShell'

/** Schmale linke Spalte — gleiche Breite wie Mitglieder-Portrait (w-14). */
const HISTORY_SIDEBAR_CLASS = 'w-14 shrink-0'

type MemberHistoryState = {
  days: XpHistoryDay[]
  target: number
  max: number
  loading: boolean
  error: string | null
  goal: XpGoalPeriod | null
  personalSymbolEmoji?: string
}

function fallbackMemberGoal(): XpGoalPeriod {
  return {
    id: 'fallback',
    goalName: 'Persönliches Ziel',
    targetXp: DEFAULT_MEMBER_XP_GOAL_TARGET,
    progressXp: 0,
    startedAt: '',
  }
}

export default function FamilyHistoryList() {
  const { family, parents, children } = useFamily()
  const todayKey = cetToday()

  const memberCount = parents.length + children.length

  const historyStartDate = useMemo(
    () => familyHistoryStartDateFromCreatedAt(family?.created_at),
    [family?.created_at],
  )

  const liveFamilyTodayTotal = useMemo(
    () =>
      parents.reduce((sum, parent) => sum + Math.max(0, parent.todayXp ?? 0), 0)
      + children.reduce((sum, child) => sum + Math.max(0, child.todayXp ?? 0), 0),
    [parents, children],
  )

  const [familyHistory, setFamilyHistory] = useState<{
    days: XpHistoryDay[]
    target: number
    max: number
    startDate: string
    endDate: string
    loading: boolean
    error: string | null
    goal: XpGoalPeriod | null
    familySymbolEmoji?: string
    familyGoalEmpty?: boolean
  }>({
    days: [],
    target: 0,
    max: 30,
    startDate: todayKey,
    endDate: todayKey,
    loading: true,
    error: null,
    goal: null,
    familyGoalEmpty: true,
  })

  const [memberHistories, setMemberHistories] = useState<Record<string, MemberHistoryState>>({})

  const members = useMemo(
    () => [
      ...parents.map((parent) => {
        const avatar = resolveParentAvatar(parent.gender, parent.avatar_url, { todayXp: parent.todayXp })
        return {
          key: `parent:${parent.id}`,
          memberKind: 'parent' as const,
          memberId: parent.id,
          name: formatParentDisplayName(parent.display_name, parent.gender),
          todayXp: parent.todayXp ?? 0,
          avatarSrc: avatar.src,
          avatarError: avatar.error,
        }
      }),
      ...children.map((child) => {
        const avatar = resolveChildAvatar(child.gender, child.age, child.portrait_id, {
          todayXp: child.todayXp,
        })
        return {
          key: `child:${child.id}`,
          memberKind: 'child' as const,
          memberId: child.id,
          name: child.display_name,
          todayXp: child.todayXp ?? 0,
          avatarSrc: avatar.src,
          avatarError: avatar.error,
        }
      }),
    ],
    [parents, children],
  )

  useEffect(() => {
    if (!family) return
    let cancelled = false

    const load = async () => {
      setFamilyHistory((prev) => ({ ...prev, loading: true, error: null }))

      const [result, familyGoalBar] = await Promise.all([
        fetchFamilyXpHistory({
          familyId: family.id,
          memberCount,
          startDate: historyStartDate,
          liveTodayTotal: liveFamilyTodayTotal,
        }),
        fetchFamilyPersonalGoalBarState(family.id),
      ])
      if (cancelled) return

      if (result.error) {
        setFamilyHistory((prev) => ({
          ...prev,
          loading: false,
          error: result.error!.message,
        }))
        return
      }

      const activeFamily = familyGoalBar.bar
      const displayGoal: XpGoalPeriod | null = activeFamily
        ? {
            id: activeFamily.goalId,
            goalName: activeFamily.title,
            targetXp: activeFamily.target,
            progressXp: activeFamily.progress,
            startedAt: '',
          }
        : null

      setFamilyHistory({
        days: result.days,
        target: result.target,
        max: result.max,
        startDate: result.startDate,
        endDate: result.endDate,
        loading: false,
        error: null,
        goal: displayGoal,
        familySymbolEmoji: activeFamily ? personalGoalSymbolEmoji(activeFamily.symbolId) : undefined,
        familyGoalEmpty: !activeFamily,
      })
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [family, memberCount, historyStartDate, liveFamilyTodayTotal])

  useEffect(() => {
    if (!family || members.length === 0) return
    let cancelled = false

    const loadMembers = async () => {
      const next: Record<string, MemberHistoryState> = {}
      const liveTodayXpByKey: Record<string, number> = {}
      const memberKeys: Array<{
        key: string
        memberKind: 'parent' | 'child'
        memberId: string
      }> = []

      for (const member of members) {
        next[member.key] = {
          days: [],
          target: 20,
          max: 30,
          loading: true,
          error: null,
          goal: null,
        }
        liveTodayXpByKey[member.key] = member.todayXp
        memberKeys.push({
          key: member.key,
          memberKind: member.memberKind,
          memberId: member.memberId,
        })
      }
      setMemberHistories(next)

      const [historyBatch, ...memberMeta] = await Promise.all([
        fetchMemberXpHistoriesBatch({
          familyId: family.id,
          members: memberKeys.map(({ memberKind, memberId }) => ({ memberKind, memberId })),
          startDate: historyStartDate,
          liveTodayXpByKey,
        }),
        ...members.map(async (member) => {
          const [goalResult, personalBar] = await Promise.all([
            fetchActiveMemberXpGoal(family.id, {
              memberKind: member.memberKind,
              memberId: member.memberId,
            }),
            fetchMemberPersonalGoalBarState(family.id, {
              memberKind: member.memberKind,
              memberId: member.memberId,
            }),
          ])
          return { member, goalResult, personalBar }
        }),
      ])
      if (cancelled) return

      for (const { member, goalResult, personalBar } of memberMeta) {
        const fallbackGoal = goalResult.goal ?? fallbackMemberGoal()
        const activePersonal = personalBar.bar
        const displayGoal: XpGoalPeriod = activePersonal
          ? {
              id: activePersonal.goalId,
              goalName: activePersonal.title,
              targetXp: activePersonal.target,
              progressXp: activePersonal.progress,
              startedAt: fallbackGoal.startedAt,
            }
          : fallbackGoal

        setMemberHistories((prev) => ({
          ...prev,
          [member.key]: {
            days: historyBatch.error ? [] : (historyBatch.byMember[member.key] ?? []),
            target: historyBatch.target,
            max: historyBatch.max,
            loading: false,
            error: historyBatch.error?.message ?? null,
            goal: displayGoal,
            personalSymbolEmoji: activePersonal
              ? personalGoalSymbolEmoji(activePersonal.symbolId)
              : undefined,
          },
        }))
      }
    }

    void loadMembers()
    return () => {
      cancelled = true
    }
  }, [family, members, historyStartDate])

  if (!family) return null

  const familyTotalXp = sumHistoryXp(familyHistory.days)
  const familyGoal = familyHistory.goal
  const familyHasActiveGoal = Boolean(familyGoal && !familyHistory.familyGoalEmpty)

  return (
    <div className="space-y-6 pb-4">
      <section className={`${CARD_SURFACE_CLASS} rounded-2xl p-4`}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {formatFamilyIdentityLabel(family)} — XP pro Tag
        </h2>

        {familyHistory.loading ? (
          <p className="mt-1 text-sm text-slate-950 dark:text-slate-400">Verlauf wird geladen …</p>
        ) : familyHistory.error ? (
          <p className="mt-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {familyHistory.error}
          </p>
        ) : (
          <>
            <div className="flex items-start gap-2">
              <div className={`${HISTORY_SIDEBAR_CLASS} flex flex-col pt-4`}>
                <XpGoalVerticalBar
                  emptyState={!familyHasActiveGoal}
                  progress={familyHasActiveGoal ? familyGoal!.progressXp : 0}
                  target={familyHasActiveGoal ? familyGoal!.targetXp : 100}
                  totalXp={familyTotalXp}
                  symbolEmoji={familyHistory.familySymbolEmoji}
                />
              </div>
              <div className="mt-4 min-w-0 flex-1">
                <XpHistoryChart
                  days={familyHistory.days}
                  target={familyHistory.target}
                  max={familyHistory.max}
                  fixedScale
                  hideInlineLegend
                  todayKey={todayKey}
                />
              </div>
            </div>
            <XpHistoryChartLegend target={familyHistory.target} className="mt-1.5" />
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Mitglieder</h2>

        {members.map((member) => {
          const history = memberHistories[member.key]
          const memberTotalXp = history?.days ? sumHistoryXp(history.days) : 0
          const memberGoal = history?.goal ?? fallbackMemberGoal()

          return (
            <article key={member.key} className={`${CARD_SURFACE_CLASS} rounded-2xl p-3`}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                  {member.name}
                </h3>
                {!history || history.loading ? null : (
                  <div className="flex shrink-0 items-baseline gap-1.5 pr-1">
                    <span className={HISTORY_TOTAL_XP_LABEL_CLASS}>Gesamt XP</span>
                    <span className="min-w-[4ch] text-right text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                      {memberTotalXp}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-start gap-2">
                <div className={`${HISTORY_SIDEBAR_CLASS} flex flex-col`}>
                  <MemberPortraitMini
                    src={member.avatarSrc}
                    error={member.avatarError}
                    className="w-full rounded-xl"
                  />
                  {!history || history.loading ? (
                    <p className="mt-2 text-[10px] text-slate-950 dark:text-slate-400">…</p>
                  ) : (
                    <div className="mt-2">
                      <XpGoalVerticalBar
                        compact
                        progress={memberGoal.progressXp}
                        target={memberGoal.targetXp}
                        symbolEmoji={history.personalSymbolEmoji}
                      />
                    </div>
                  )}
                </div>
                <div className="mt-2.5 min-w-0 flex-1">
                  {!history || history.loading ? (
                    <p className="text-xs text-slate-950 dark:text-slate-400">Wird geladen …</p>
                  ) : history.error ? (
                    <p className="text-xs text-red-700 dark:text-red-300">{history.error}</p>
                  ) : (
                    <XpHistoryChart
                      days={history.days}
                      target={history.target}
                      max={history.max}
                      compact
                      fixedScale
                      yAxisStep={5}
                      todayKey={todayKey}
                    />
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
