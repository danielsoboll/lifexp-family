'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import AvatarWasJetztTunThoughtBubble from './AvatarWasJetztTunThoughtBubble'
import MemberDailyXpBar from './MemberDailyXpBar'
import MemberPersonalGoalsPanel from './MemberPersonalGoalsPanel'
import ProgressBar from './ProgressBar'
import QuestCompletionAssigneePhotosDisplay from './QuestCompletionAssigneePhotosDisplay'
import QuestCompletionPhotoSheet from './QuestCompletionPhotoSheet'
import QuestCompletionReactionDisplay from './QuestCompletionReactionDisplay'
import QuestFinalConfirmButton from './QuestFinalConfirmButton'
import YesterdayOpenQuestsSection from './YesterdayOpenQuestsSection'
import XpGoalVerticalBar from './XpGoalVerticalBar'
import DailyStreakCheckin from './DailyStreakCheckin'
import DangerConfirmAction from './DangerConfirmAction'
import { notifyFamilyDataChanged, useFamily, FAMILY_DATA_CHANGED_EVENT } from './FamilyProvider'
import { formatChildAge } from '../lib/family/memberGender'
import { markPlusDiscoverUnlocked } from '../lib/family/plusDiscoverUnlock'
import { formatParentDisplayName } from '../lib/family/familyDisplayName'
import { isFamilyPlus } from '../lib/family/familyPlus'
import { resolveChildAvatar, resolveParentAvatar } from '../lib/family/memberAvatar'
import { completeQuestForChild, completeQuestForParent, adminDeleteQuestCompletion } from '../lib/family/questCompletions'
import { cetToday, normalizeDateKey } from '../lib/cetDate'
import { fetchMemberStreakClaimedToday } from '../lib/family/dailyStreak'
import { persistMemberStreakIntroSeen } from '../lib/family/streakIntroHint'
import { fetchFamilyQuestBoard, questAppliesToMember } from '../lib/family/quests'
import { fulfillmentForMemberOnQuest, aggregateQuestFulfillmentStatus, canSessionConfirmQuestCompletion } from '../lib/family/questConfirmation'
import { fetchMemberPersonalGoalBarState, type MemberPersonalGoalBarState } from '../lib/family/personalGoals'
import { fetchQuestCompletionEnrichment, type QuestCompletionEnrichment } from '../lib/family/questCompletionPlus'
import { personalGoalSymbolEmoji } from '../lib/family/personalGoalSymbols'
import type { QuestCompletionOnDate, QuestWithCompletion } from '../lib/family/types'
import {
  CARD_SURFACE_CLASS,
  GOAL_BAR_HIT_CLASS,
  MEMBER_DETAIL_CARD_WIDTH_CLASS,
  MEMBER_DETAIL_GOAL_BAR_COLUMN_CLASS,
  MEMBER_DETAIL_HERO_CLASS,
  PRESSABLE_3D_CLASS,
} from '../lib/appShell'
import { useThoughtBubbleVisibility } from '../lib/useThoughtBubbleVisibility'

type MemberDetailViewProps = {
  memberKind: 'parent' | 'child'
  memberId: string
}

function completionForMember(
  quest: QuestWithCompletion,
  kind: 'parent' | 'child',
  id: string,
): QuestCompletionOnDate | undefined {
  return quest.completionsOnDate.find((row) => (kind === 'child' ? row.childId === id : row.parentId === id))
}

export default function MemberDetailView({ memberKind, memberId }: MemberDetailViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    family,
    parents,
    children,
    loading: familyLoading,
    memberKind: sessionKind,
    parent: sessionParent,
    activeChild,
    canAdmin,
    session,
  } = useFamily()
  const [quests, setQuests] = useState<QuestWithCompletion[]>([])
  const [yesterdayOpenQuests, setYesterdayOpenQuests] = useState<QuestWithCompletion[]>([])
  const [questsLoading, setQuestsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyQuestId, setBusyQuestId] = useState<string | null>(null)
  const [deleteBusyCompletionId, setDeleteBusyCompletionId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [streakClaimed, setStreakClaimed] = useState<boolean | null>(null)
  const [goalBar, setGoalBar] = useState<MemberPersonalGoalBarState | null>(null)
  const [goalsEditorOpen, setGoalsEditorOpen] = useState(false)
  const [photoSheet, setPhotoSheet] = useState<{ completionId: string; questTitle: string } | null>(null)
  const [completionEnrichment, setCompletionEnrichment] = useState<Map<string, QuestCompletionEnrichment>>(new Map())

  const plusActive = isFamilyPlus(family)

  const isSelf =
    (memberKind === 'parent' && sessionKind === 'parent' && sessionParent?.id === memberId) ||
    (memberKind === 'child' && sessionKind === 'child' && activeChild?.id === memberId)

  const parent = memberKind === 'parent' ? parents.find((p) => p.id === memberId) : undefined
  const child = memberKind === 'child' ? children.find((c) => c.id === memberId) : undefined

  useEffect(() => {
    if (!family) return
    let cancelled = false

    const loadQuests = async () => {
      setQuestsLoading(true)
      const { board, error: fetchError } = await fetchFamilyQuestBoard(family.id)
      if (cancelled) return
      setQuestsLoading(false)
      if (fetchError) {
        setError(fetchError.message)
        setQuests([])
        setYesterdayOpenQuests([])
        return
      }
      setError(null)
      const applies = (q: QuestWithCompletion) =>
        questAppliesToMember(q.child_id, q.assignees, memberKind, memberId)
      const today = cetToday()
      setQuests(
        board.todayAndTomorrow.filter(
          (q) => applies(q) && normalizeDateKey(q.task_date) === today,
        ),
      )
      setYesterdayOpenQuests(board.yesterdayOpen.filter(applies))
    }

    void loadQuests()
    window.addEventListener(FAMILY_DATA_CHANGED_EVENT, loadQuests)
    return () => {
      cancelled = true
      window.removeEventListener(FAMILY_DATA_CHANGED_EVENT, loadQuests)
    }
  }, [family?.id, memberKind, memberId])

  const loadCompletionEnrichment = useCallback(async (rows: QuestWithCompletion[]) => {
    if (!plusActive) {
      setCompletionEnrichment(new Map())
      return
    }
    const ids = rows
      .map((quest) => completionForMember(quest, memberKind, memberId)?.id)
      .filter((id): id is string => Boolean(id && id !== 'local'))
    const { byCompletionId } = await fetchQuestCompletionEnrichment(ids)
    setCompletionEnrichment(byCompletionId)
  }, [plusActive, memberKind, memberId])

  useEffect(() => {
    if (!family || questsLoading) return
    void loadCompletionEnrichment([...quests, ...yesterdayOpenQuests])
  }, [family, quests, yesterdayOpenQuests, questsLoading, loadCompletionEnrichment])

  useEffect(() => {
    if (!plusActive) return
    const onRefresh = () => void loadCompletionEnrichment(quests)
    window.addEventListener(FAMILY_DATA_CHANGED_EVENT, onRefresh)
    return () => window.removeEventListener(FAMILY_DATA_CHANGED_EVENT, onRefresh)
  }, [plusActive, quests, loadCompletionEnrichment])

  useEffect(() => {
    if (!family) return
    let cancelled = false

    const loadGoalBar = async () => {
      const { bar } = await fetchMemberPersonalGoalBarState(family.id, { memberKind, memberId })
      if (!cancelled) setGoalBar(bar)
    }

    void loadGoalBar()
    const onRefresh = () => void loadGoalBar()
    window.addEventListener(FAMILY_DATA_CHANGED_EVENT, onRefresh)
    return () => {
      cancelled = true
      window.removeEventListener(FAMILY_DATA_CHANGED_EVENT, onRefresh)
    }
  }, [family?.id, memberKind, memberId])

  useEffect(() => {
    if (!family || !isSelf) {
      setStreakClaimed(null)
      return
    }
    let cancelled = false
    void (async () => {
      const { claimed } = await fetchMemberStreakClaimedToday({
        familyId: family.id,
        memberKind,
        memberId,
      })
      if (!cancelled) setStreakClaimed(claimed)
    })()
    return () => {
      cancelled = true
    }
  }, [family, isSelf, memberKind, memberId])

  useEffect(() => {
    if (!isSelf) return
    const dbSeen =
      memberKind === 'parent'
        ? parent?.streak_intro_seen === true
        : child?.streak_intro_seen === true
    void persistMemberStreakIntroSeen({ memberKind, memberId, dbSeen })
  }, [isSelf, memberKind, memberId, parent?.streak_intro_seen, child?.streak_intro_seen])

  const displayName =
    memberKind === 'parent' && parent
      ? formatParentDisplayName(parent.display_name, parent.gender)
      : child?.display_name

  const todayXp = memberKind === 'parent' ? (parent?.todayXp ?? 0) : (child?.todayXp ?? 0)
  const totalXpForBubble = memberKind === 'child' ? (child?.total_xp ?? 0) : todayXp

  const avatar =
    memberKind === 'parent' && parent
      ? resolveParentAvatar(parent.gender, parent.avatar_url, { todayXp })
      : child
        ? resolveChildAvatar(child.gender, child.age, child.portrait_id, { todayXp })
        : { src: null, error: null }

  const thoughtBubbleEligible =
    isSelf && !familyLoading && Boolean(displayName) && Boolean(avatar.src) && !avatar.error

  const { visible: showThoughtBubble, dismissThoughtBubble } = useThoughtBubbleVisibility({
    eligible: thoughtBubbleEligible,
    totalXp: totalXpForBubble,
  })

  const handleThoughtBubbleActivate = useCallback(() => {
    dismissThoughtBubble()
    router.push('/was-jetzt-tun')
  }, [dismissThoughtBubble, router])

  useEffect(() => {
    if (searchParams.get('ziele') !== '1') return
    if (!isSelf) return
    setGoalsEditorOpen(true)
  }, [searchParams, isSelf])

  const memberQuests = useMemo(
    () => [...quests, ...yesterdayOpenQuests],
    [quests, yesterdayOpenQuests],
  )

  const completedCount = useMemo(
    () => memberQuests.filter((q) => fulfillmentForMemberOnQuest(q, memberKind, memberId) === 'done').length,
    [memberQuests, memberKind, memberId],
  )

  const questProgress = memberQuests.length > 0 ? Math.round((completedCount / memberQuests.length) * 100) : 0

  const completeQuest = async (quest: QuestWithCompletion) => {
    if (!family || !isSelf) return
    setBusyQuestId(quest.id)
    setError(null)

    const result =
      memberKind === 'parent'
        ? await completeQuestForParent({ quest, parentId: memberId, familyId: family.id })
        : await completeQuestForChild({ quest, childId: memberId, familyId: family.id })

    setBusyQuestId(null)
    if (result.error) {
      setError(result.error.message)
      return
    }

    markPlusDiscoverUnlocked(family.id)
    notifyFamilyDataChanged()

    const completionId = result.completionId ?? null

    setQuests((prev) =>
      prev.map((q) => {
        if (q.id !== quest.id) return q
        const now = new Date().toISOString()
        const nextStatus = result.creatorConfirmed ? ('done' as const) : ('awaiting_creator' as const)
        const resolvedCompletionId = completionId ?? q.assigneeCompletion?.completionId ?? 'local'
        const nextCompletions = [
          ...q.completionsOnDate.filter((row) =>
            memberKind === 'child' ? row.childId !== memberId : row.parentId !== memberId,
          ),
          {
            id: resolvedCompletionId,
            childId: memberKind === 'child' ? memberId : null,
            parentId: memberKind === 'parent' ? memberId : null,
            assigneeConfirmedAt: now,
            creatorConfirmedAt: result.creatorConfirmed ? now : null,
          },
        ]
        return {
          ...q,
          fulfillmentStatus: nextStatus,
          completionsOnDate: nextCompletions,
          assigneeCompletion: {
            completionId: resolvedCompletionId,
            assigneeConfirmedAt: now,
            creatorConfirmedAt: result.creatorConfirmed ? now : null,
          },
        }
      }),
    )

    if (plusActive && completionId && !result.creatorConfirmed) {
      setPhotoSheet({ completionId, questTitle: quest.title })
    }
  }

  const removeCompletion = async (completionId: string, questId: string): Promise<boolean> => {
    if (!family) return false
    setDeleteBusyCompletionId(completionId)
    setDeleteError(null)
    const { error: removeError } = await adminDeleteQuestCompletion(completionId)
    setDeleteBusyCompletionId(null)
    if (removeError) {
      setDeleteError(removeError.message)
      return false
    }
    setDeleteError(null)
    notifyFamilyDataChanged()
    setQuests((prev) =>
      prev.map((quest) => {
        if (quest.id !== questId) return quest
        const removed = quest.completionsOnDate.find((row) => row.id === completionId)
        const nextCompletions = quest.completionsOnDate.filter((row) => row.id !== completionId)
        const wasConfirmed = Boolean(removed?.creatorConfirmedAt)
        const nextFulfillment = aggregateQuestFulfillmentStatus(quest.assignees, nextCompletions)
        return {
          ...quest,
          completionsOnDate: nextCompletions,
          completionChildIds:
            wasConfirmed && memberKind === 'child'
              ? quest.completionChildIds.filter((id) => id !== memberId)
              : quest.completionChildIds,
          completionParentIds:
            wasConfirmed && memberKind === 'parent'
              ? quest.completionParentIds.filter((id) => id !== memberId)
              : quest.completionParentIds,
          assigneeCompletion:
            quest.assigneeCompletion?.completionId === completionId ? null : quest.assigneeCompletion,
          fulfillmentStatus: nextFulfillment,
          completedToday: nextFulfillment === 'done',
        }
      }),
    )
    return true
  }

  const renderQuestList = (items: QuestWithCompletion[]) => (
    <ul className="space-y-2">
      {items.map((quest) => {
        const status = fulfillmentForMemberOnQuest(quest, memberKind, memberId)
        const done = status === 'done'
        const awaiting = status === 'awaiting_creator'
        const completion = completionForMember(quest, memberKind, memberId)
        const canAdminRemove = canAdmin && completion && (done || awaiting)
        const enrichment =
          completion && completion.id !== 'local' ? completionEnrichment.get(completion.id) : undefined

        const canFinalConfirm =
          !isSelf &&
          awaiting &&
          completion &&
          completion.id !== 'local' &&
          session &&
          canSessionConfirmQuestCompletion({
            quest,
            session,
            assigneeChildId: completion.childId,
            assigneeParentId: completion.parentId,
            canAdmin,
          })

        return (
          <li
            key={quest.id}
            className={`rounded-xl border-2 px-3 py-2.5 ${
              done
                ? 'border-emerald-300/80 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/30'
                : awaiting
                  ? 'border-sky-300/80 bg-sky-50/80 dark:border-sky-800 dark:bg-sky-950/30'
                  : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900/80'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-base font-bold leading-snug text-slate-900 dark:text-slate-100">{quest.title}</p>
                {quest.description ? (
                  <p className="mt-1 text-sm font-bold leading-snug text-slate-950 dark:text-slate-300">
                    {quest.description}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                +{quest.xp_reward} XP
              </span>
            </div>
            <p
              className={`mt-1.5 text-xs font-bold uppercase tracking-wide ${
                done
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : awaiting
                    ? 'text-sky-700 dark:text-sky-300'
                    : 'text-slate-950 dark:text-slate-400'
              }`}
            >
              {done ? 'Erledigt' : awaiting ? 'Wartet auf Bestätigung' : 'Offen'}
            </p>
            {(done || awaiting) && enrichment && (enrichment.photos.length > 0 || enrichment.assigneeMessage) ? (
              <QuestCompletionAssigneePhotosDisplay
                photos={enrichment.photos}
                message={enrichment.assigneeMessage}
                label={isSelf ? 'Deine Fotos' : 'Fotos'}
              />
            ) : null}
            {done && enrichment?.reaction ? (
              <QuestCompletionReactionDisplay reaction={enrichment.reaction} />
            ) : null}
            {isSelf && status === 'open' ? (
              <button
                type="button"
                disabled={busyQuestId === quest.id}
                onClick={() => void completeQuest(quest)}
                className={`${PRESSABLE_3D_CLASS} mt-2.5 w-full rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-60`}
              >
                {busyQuestId === quest.id ? 'Speichern …' : 'Schritt 1: Als erledigt melden'}
              </button>
            ) : null}
            {canFinalConfirm && completion ? (
              <QuestFinalConfirmButton
                completionId={completion.id}
                xpReward={quest.xp_reward}
                assigneeName={displayName}
                assigneeChildId={completion.childId}
                assigneeParentId={completion.parentId}
                onConfirmed={() => {
                  if (hasActiveGoal && goalBar) {
                    setGoalBar((prev) =>
                      prev
                        ? {
                            ...prev,
                            progress: Math.min(prev.target, prev.progress + quest.xp_reward),
                          }
                        : prev,
                    )
                  }
                }}
              />
            ) : null}
            {canAdminRemove && completion ? (
              <div className="mt-2.5">
                <DangerConfirmAction
                  triggerLabel={done ? 'Abschluss löschen' : 'Meldung zurücknehmen'}
                  confirmTitle={
                    done
                      ? `„${quest.title}" wirklich zurücksetzen?`
                      : `Meldung zu „${quest.title}" zurücknehmen?`
                  }
                  confirmDescription={
                    done
                      ? `Die ${quest.xp_reward} XP werden von ${displayName} abgezogen. Die Quest ist danach wieder offen.`
                      : 'Die Quest wartet noch auf Bestätigung — es wurden noch keine XP vergeben.'
                  }
                  onConfirm={() => removeCompletion(completion.id, quest.id)}
                  busy={deleteBusyCompletionId === completion.id}
                />
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )

  if (familyLoading) {
    return <p className="text-sm text-slate-950 dark:text-slate-400">Wird geladen …</p>
  }

  if (!displayName) {
    return <p className="text-sm text-slate-950 dark:text-slate-400">Familienmitglied nicht gefunden.</p>
  }

  const canOpenGoalsEditor = isSelf
  const hasActiveGoal = Boolean(goalBar?.showBar)

  const openGoalsEditor = () => {
    if (!isSelf) return
    setGoalsEditorOpen(true)
  }

  const goalBarBottomInset =
    memberKind === 'child' && child && formatChildAge(child.age) ? 'pb-[2.75rem]' : 'pb-[1.75rem]'

  const goalBarHitClass = `${GOAL_BAR_HIT_CLASS} flex w-full items-center justify-center overflow-visible rounded-xl px-0 py-0.5`

  const goalBarControl = (
    <XpGoalVerticalBar
      detail
      rewardLabel
      emptyState={!hasActiveGoal}
      progress={hasActiveGoal ? goalBar!.progress : 0}
      target={hasActiveGoal ? goalBar!.target : 100}
      symbolEmoji={hasActiveGoal ? personalGoalSymbolEmoji(goalBar!.symbolId) : undefined}
    />
  )

  return (
    <div className="space-y-6">
      <div className={MEMBER_DETAIL_HERO_CLASS}>
        <div className="mx-auto flex w-full max-w-[18.5rem] items-stretch sm:max-w-[19.5rem]">
          <div
            className={`flex ${MEMBER_DETAIL_GOAL_BAR_COLUMN_CLASS} flex-col justify-end ${goalBarBottomInset}`}
          >
            {isSelf ? (
              <button
                type="button"
                onClick={openGoalsEditor}
                className={`${goalBarHitClass} cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600`}
                aria-label={hasActiveGoal ? 'Belohnungs-Fortschritt anzeigen' : 'Belohnung anlegen'}
                title={hasActiveGoal ? 'Belohnungen verwalten' : 'Belohnung anlegen'}
              >
                {goalBarControl}
              </button>
            ) : (
              <div
                className={`${goalBarHitClass} cursor-default`}
                aria-label={hasActiveGoal ? 'Belohnungs-Fortschritt' : 'Noch keine Belohnung eingetragen'}
              >
                {goalBarControl}
              </div>
            )}
          </div>
          <article
            className={`${CARD_SURFACE_CLASS} ${MEMBER_DETAIL_CARD_WIDTH_CLASS} ml-0.5 flex shrink-0 flex-col items-center rounded-2xl p-3 text-center`}
          >
        {avatar.error ? (
          <div className="flex aspect-[5/6] w-full items-center justify-center rounded-xl bg-slate-100 px-1 dark:bg-slate-800">
            <p className="text-[10px] leading-tight text-amber-800 dark:text-amber-200">{avatar.error}</p>
          </div>
        ) : avatar.src ? (
          <div className="relative aspect-[5/6] w-full overflow-visible rounded-xl bg-slate-100 dark:bg-slate-800">
            <div className="absolute inset-0 overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatar.src} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
            </div>
            {thoughtBubbleEligible ? (
              <AvatarWasJetztTunThoughtBubble
                visible={showThoughtBubble}
                onActivate={handleThoughtBubbleActivate}
              />
            ) : null}
          </div>
        ) : (
          <div className="flex aspect-[5/6] w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <span className="text-xs text-slate-950 dark:text-slate-400">Kein Portrait</span>
          </div>
        )}
        {isSelf && family ? (
          <DailyStreakCheckin
            layout="detail"
            familyId={family.id}
            memberKind={memberKind}
            memberId={memberId}
            claimed={streakClaimed === true}
            onClaimed={() => setStreakClaimed(true)}
          />
        ) : null}
        <div className="mt-1.5 w-full px-0.5">
          <MemberDailyXpBar todayXp={todayXp} />
        </div>
        <h1 className="mt-1.5 line-clamp-2 text-base font-bold text-slate-900 dark:text-slate-100">{displayName}</h1>
        {memberKind === 'child' && child && formatChildAge(child.age) ? (
          <p className="mt-0.5 text-xs text-slate-950 dark:text-slate-400">{formatChildAge(child.age)}</p>
        ) : null}
          </article>
        </div>
      </div>

      <section id="quests-heute" className={`${CARD_SURFACE_CLASS} space-y-3 rounded-2xl p-4 scroll-mt-4`}>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Quests heute</h2>
          <p className="mt-1 text-sm text-slate-950 dark:text-slate-400">
            {completedCount} von {memberQuests.length} erledigt
          </p>
        </div>
        {memberQuests.length > 0 ? <ProgressBar progress={questProgress} /> : null}

        {questsLoading ? (
          <p className="text-sm text-slate-950 dark:text-slate-400">Quests werden geladen …</p>
        ) : error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : deleteError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {deleteError}
          </p>
        ) : memberQuests.length === 0 ? (
          <p className="text-sm text-slate-950 dark:text-slate-400">Keine Quests für heute zugewiesen.</p>
        ) : (
          <>
            {quests.length > 0 ? renderQuestList(quests) : (
              <p className="text-sm text-slate-950 dark:text-slate-400">Keine Quests für heute — unten offen von gestern.</p>
            )}
            {yesterdayOpenQuests.length > 0 ? (
              <YesterdayOpenQuestsSection compact>
                {renderQuestList(yesterdayOpenQuests)}
              </YesterdayOpenQuestsSection>
            ) : null}
          </>
        )}
      </section>

      <MemberPersonalGoalsPanel
        memberKind={memberKind}
        memberId={memberId}
        memberLabel={displayName}
        isSelf={isSelf}
        editorOpen={goalsEditorOpen}
        onEditorOpenChange={setGoalsEditorOpen}
      />

      {photoSheet && family ? (
        <QuestCompletionPhotoSheet
          familyId={family.id}
          completionId={photoSheet.completionId}
          questTitle={photoSheet.questTitle}
          onClose={() => setPhotoSheet(null)}
          onUploaded={() => {
            notifyFamilyDataChanged()
            void loadCompletionEnrichment(quests)
          }}
        />
      ) : null}
    </div>
  )
}
