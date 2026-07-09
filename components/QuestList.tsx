'use client'

import { useEffect, useMemo, useState } from 'react'

import FamilyPersonalGoalsReadySection from './FamilyPersonalGoalsReadySection'
import FamilyQuestConferenceSection from './FamilyQuestConferenceSection'
import FamilyGroupPortrait from './FamilyGroupPortrait'
import QuestEditSheet from './QuestEditSheet'
import YesterdayOpenQuestsSection from './YesterdayOpenQuestsSection'
import { useFamily, FAMILY_DATA_CHANGED_EVENT } from './FamilyProvider'
import { fetchFamilyQuestBoard, type FamilyQuestBoard } from '../lib/family/quests'
import { canSessionModifyQuest, canSessionDeleteQuest, questIsOpenForEditing } from '../lib/family/questConfirmation'
import type { QuestWithCompletion } from '../lib/family/types'
import { groupQuestsForDisplay, partitionQuestsByDone, type QuestDisplayGroup, type QuestMemberGroup } from '../lib/family/questMemberGroups'
import { memberAccentStyle, normalizeMemberAccentKey, type MemberAccentKey } from '../lib/family/memberAccentColor'
import QuestCard from './QuestCard'

function renderQuestCard(
  quest: QuestWithCompletion,
  props: {
    children: ReturnType<typeof useFamily>['children']
    parents: ReturnType<typeof useFamily>['parents']
    session: ReturnType<typeof useFamily>['session']
    canAdmin: boolean
    grouped?: boolean
    familyWide?: boolean
    familyAccentKey?: MemberAccentKey
    groupAssignee?: QuestMemberGroup['assignee']
    onManage: (quest: QuestWithCompletion) => void
  },
) {
  const canEdit = Boolean(
    props.session &&
      !quest.recurring_template_id &&
      canSessionModifyQuest(quest, props.session) &&
      questIsOpenForEditing(quest),
  )
  const canDelete = Boolean(
    props.session && canSessionDeleteQuest(quest, props.session, props.canAdmin),
  )
  const manageable = canEdit || canDelete
  return (
    <QuestCard
      key={quest.id}
      quest={quest}
      children={props.children}
      parents={props.parents}
      grouped={props.grouped}
      familyWide={props.familyWide}
      familyAccentKey={props.familyAccentKey}
      manageable={manageable}
      manageMode={canEdit ? 'edit' : canDelete ? 'delete' : undefined}
      onManage={manageable ? () => props.onManage(quest) : undefined}
      session={props.session}
      canAdmin={props.canAdmin}
      groupAssignee={props.groupAssignee}
    />
  )
}

function renderPartitionedQuests(
  quests: QuestWithCompletion[],
  cardProps: {
    children: ReturnType<typeof useFamily>['children']
    parents: ReturnType<typeof useFamily>['parents']
    session: ReturnType<typeof useFamily>['session']
    canAdmin: boolean
    onManage: (quest: QuestWithCompletion) => void
    groupAssignee?: QuestMemberGroup['assignee']
  },
  options?: { grouped?: boolean; familyWide?: boolean; familyAccentKey?: MemberAccentKey },
) {
  const { active, done } = partitionQuestsByDone(quests)

  return (
    <>
      {active.map((quest) =>
        renderQuestCard(quest, {
          ...cardProps,
          grouped: options?.grouped ?? true,
          familyWide: options?.familyWide,
          familyAccentKey: options?.familyAccentKey,
        }),
      )}
      {done.length > 0 ? (
        <div className="space-y-2 border-t border-emerald-300/70 pt-3 dark:border-emerald-800/55">
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
            Erledigt
          </p>
          {done.map((quest) =>
            renderQuestCard(quest, {
              ...cardProps,
              grouped: options?.grouped ?? true,
              familyWide: options?.familyWide,
              familyAccentKey: options?.familyAccentKey,
            }),
          )}
        </div>
      ) : null}
    </>
  )
}

function renderMemberQuestSection(
  group: QuestMemberGroup,
  cardProps: {
    children: ReturnType<typeof useFamily>['children']
    parents: ReturnType<typeof useFamily>['parents']
    session: ReturnType<typeof useFamily>['session']
    canAdmin: boolean
    onManage: (quest: QuestWithCompletion) => void
    groupAssignee?: QuestMemberGroup['assignee']
  },
) {
  const accent = memberAccentStyle(group.accentKey)
  return (
    <section
      key={`${group.assignee.type}:${group.assignee.id}`}
      className="rounded-2xl border border-slate-200/90 bg-white/60 p-3.5 shadow-sm dark:border-slate-700/90 dark:bg-slate-900/35"
    >
      <h2 className={`text-lg font-bold tracking-tight ${accent.nameClass}`}>{group.label}</h2>
      <div className="mt-3 space-y-2.5">{renderPartitionedQuests(group.quests, { ...cardProps, groupAssignee: group.assignee })}</div>
    </section>
  )
}

function renderQuestGroups(
  groups: QuestDisplayGroup[],
  cardProps: {
    children: ReturnType<typeof useFamily>['children']
    parents: ReturnType<typeof useFamily>['parents']
    session: ReturnType<typeof useFamily>['session']
    canAdmin: boolean
    onManage: (quest: QuestWithCompletion) => void
    groupAssignee?: QuestMemberGroup['assignee']
  },
  familyAccentKey: MemberAccentKey,
) {
  const familyGroup = groups.find((group): group is Extract<QuestDisplayGroup, { kind: 'family' }> => group.kind === 'family')
  const parentGroups = groups.filter(
    (group): group is QuestMemberGroup => group.kind === 'member' && group.assignee.type === 'parent',
  )
  const childGroups = groups.filter(
    (group): group is QuestMemberGroup => group.kind === 'member' && group.assignee.type === 'child',
  )

  return (
    <div className="space-y-6">
      {familyGroup ? (
        <section className="rounded-2xl border border-slate-200/90 bg-white/60 p-3.5 shadow-sm dark:border-slate-700/90 dark:bg-slate-900/35">
          <div className="flex items-center gap-3">
            <FamilyGroupPortrait className="w-16 shrink-0" />
            <h2 className={`text-lg font-bold tracking-tight ${memberAccentStyle(familyAccentKey).nameClass}`}>
              {familyGroup.label}
            </h2>
          </div>
          <div className="mt-3 space-y-2.5">
            {renderPartitionedQuests(familyGroup.quests, cardProps, {
              grouped: true,
              familyWide: true,
              familyAccentKey,
            })}
          </div>
        </section>
      ) : null}

      {parentGroups.length > 0 ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              Admin-Aufgaben
            </h2>
            <p className="mt-0.5 text-xs text-slate-950 dark:text-slate-400">Aufgaben der Erwachsenen.</p>
          </div>
          <div className="space-y-4">
            {parentGroups.map((group) => renderMemberQuestSection(group, cardProps))}
          </div>
        </div>
      ) : null}

      {childGroups.length > 0 ? (
        <div className="space-y-4">
          {childGroups.map((group) => renderMemberQuestSection(group, cardProps))}
        </div>
      ) : null}
    </div>
  )
}

export default function QuestList() {
  const { family, children, parents, session, canAdmin } = useFamily()
  const [board, setBoard] = useState<FamilyQuestBoard>({ todayAndTomorrow: [], yesterdayOpen: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editQuest, setEditQuest] = useState<QuestWithCompletion | null>(null)

  useEffect(() => {
    if (!family) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      const { board: loaded, error: fetchError } = await fetchFamilyQuestBoard(family.id)
      if (cancelled) return
      setLoading(false)
      if (fetchError) {
        setError(fetchError.message)
        return
      }
      setError(null)
      setBoard(loaded)
    }

    void load()

    const onRefresh = () => void load()
    window.addEventListener(FAMILY_DATA_CHANGED_EVENT, onRefresh)
    return () => {
      cancelled = true
      window.removeEventListener(FAMILY_DATA_CHANGED_EVENT, onRefresh)
    }
  }, [family?.id])

  const groups = useMemo(
    () => groupQuestsForDisplay(board.todayAndTomorrow, parents, children, family?.name),
    [board.todayAndTomorrow, parents, children, family?.name],
  )

  const yesterdayGroups = useMemo(
    () => groupQuestsForDisplay(board.yesterdayOpen, parents, children, family?.name),
    [board.yesterdayOpen, parents, children, family?.name],
  )

  const cardProps = useMemo(
    () => ({
      children,
      parents,
      session,
      canAdmin,
      onManage: setEditQuest,
    }),
    [children, parents, session, canAdmin],
  )

  if (!family) return null

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

  const hasToday = board.todayAndTomorrow.length > 0
  const hasYesterdayOpen = board.yesterdayOpen.length > 0
  const familyAccentKey = normalizeMemberAccentKey(family.accent_key)

  return (
    <>
      <FamilyPersonalGoalsReadySection />
      <FamilyQuestConferenceSection placement="top" />

      {!hasToday && !hasYesterdayOpen ? (
        <p className="text-sm text-slate-950 dark:text-slate-400">
          Noch keine Quests für heute oder morgen.
        </p>
      ) : (
        <div className="space-y-5">
          {!hasToday && hasYesterdayOpen ? (
            <p className="text-sm text-slate-950 dark:text-slate-400">
              Für heute und morgen sind noch keine Quests eingetragen.
            </p>
          ) : null}
          {renderQuestGroups(groups, cardProps, familyAccentKey)}
          {hasYesterdayOpen ? (
            <YesterdayOpenQuestsSection>
              <div className="space-y-6">{renderQuestGroups(yesterdayGroups, cardProps, familyAccentKey)}</div>
            </YesterdayOpenQuestsSection>
          ) : null}
        </div>
      )}

      <QuestEditSheet quest={editQuest} open={editQuest !== null} onClose={() => setEditQuest(null)} />
    </>
  )
}
