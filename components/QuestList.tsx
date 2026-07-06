'use client'

import { useEffect, useMemo, useState } from 'react'

import FamilyQuestConferenceSection from './FamilyQuestConferenceSection'
import FamilyGroupPortrait from './FamilyGroupPortrait'
import QuestEditSheet from './QuestEditSheet'
import YesterdayOpenQuestsSection from './YesterdayOpenQuestsSection'
import { useFamily, FAMILY_DATA_CHANGED_EVENT } from './FamilyProvider'
import { fetchFamilyQuestBoard, type FamilyQuestBoard } from '../lib/family/quests'
import { canSessionModifyQuest, canSessionDeleteQuest, questIsOpenForEditing } from '../lib/family/questConfirmation'
import type { QuestWithCompletion } from '../lib/family/types'
import { groupQuestsForDisplay, type QuestDisplayGroup } from '../lib/family/questMemberGroups'
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
    />
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
  },
  familyAccentKey: MemberAccentKey,
) {
  return groups.map((group) => {
    if (group.kind === 'family') {
      const accent = memberAccentStyle(familyAccentKey)
      return (
        <section key="family">
          <div className="flex items-center gap-3">
            <FamilyGroupPortrait className="w-16 shrink-0" />
            <h2 className={`text-lg font-bold tracking-tight ${accent.nameClass}`}>{group.label}</h2>
          </div>
          <div className="mt-2 space-y-2.5">
            {group.quests.map((quest) =>
              renderQuestCard(quest, {
                ...cardProps,
                grouped: true,
                familyWide: true,
                familyAccentKey,
              }),
            )}
          </div>
        </section>
      )
    }

    const accent = memberAccentStyle(group.accentKey)
    return (
      <section key={`${group.assignee.type}:${group.assignee.id}`}>
        <h2 className={`text-lg font-bold tracking-tight ${accent.nameClass}`}>{group.label}</h2>
        <div className="mt-2 space-y-2.5">
          {group.quests.map((quest) => renderQuestCard(quest, { ...cardProps, grouped: true }))}
        </div>
      </section>
    )
  })
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

  const allQuests = useMemo(
    () => [...board.todayAndTomorrow, ...board.yesterdayOpen],
    [board.todayAndTomorrow, board.yesterdayOpen],
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
              <div className="space-y-5">{renderQuestGroups(yesterdayGroups, cardProps, familyAccentKey)}</div>
            </YesterdayOpenQuestsSection>
          ) : null}
        </div>
      )}

      <FamilyQuestConferenceSection quests={allQuests} />

      <QuestEditSheet quest={editQuest} open={editQuest !== null} onClose={() => setEditQuest(null)} />
    </>
  )
}
