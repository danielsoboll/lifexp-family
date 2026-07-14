'use client'

import { memberLabelForAssignee } from './MemberSingleSelect'
import QuestFinalConfirmButton from './QuestFinalConfirmButton'
import type { ParentMember } from '../lib/family/members'
import type { ChildWithTodayXp, QuestWithCompletion } from '../lib/family/types'
import { questPrimaryAssignee } from '../lib/family/quests'
import {
  assigneeDisplayNameFromCompletion,
  fulfillmentForMemberOnQuest,
  isFamilyWideQuest,
  pendingConfirmableCompletions,
  questConfirmationPerspectiveForMemberOnQuest,
  questConfirmationPerspectiveForSessionOnQuest,
} from '../lib/family/questConfirmation'
import { formatQuestDayLabel } from '../lib/family/questRules'
import { accentKeyForAssignee, memberAccentStyle, type MemberAccentKey } from '../lib/family/memberAccentColor'
import {
  QUEST_CONFIRMATION_PERSPECTIVE_BADGE,
  QUEST_STATUS_BADGE_CLASS,
  questStatusSurfaceClass,
} from '../lib/family/questCardSurface'
import { formatParentDisplayName } from '../lib/family/familyDisplayName'
import { questCreatorLabel } from '../lib/family/questCreatorLabel'
import type { FamilySession } from '../lib/familySession'
import type { QuestAssignee, QuestFulfillmentStatus } from '../lib/family/types'

type QuestCardProps = {
  quest: QuestWithCompletion
  children: ChildWithTodayXp[]
  parents?: ParentMember[]
  /** Name steht in der Gruppenüberschrift — nicht nochmal auf der Karte. */
  grouped?: boolean
  /** Familien-Quest (Alle) — neutrale Kartenfarbe. */
  familyWide?: boolean
  familyAccentKey?: MemberAccentKey
  /** Nur Ersteller: Klick öffnet Bearbeiten/Löschen. Admins: Entfernen (z. B. wiederkehrende Einträge). */
  manageable?: boolean
  manageMode?: 'edit' | 'delete'
  onManage?: () => void
  session?: FamilySession | null
  canAdmin?: boolean
  /** Mitglied der Gruppe — für perspektivabhängige Bestätigungs-Anzeige. */
  groupAssignee?: QuestAssignee
}

function cardShellClass(
  quest: QuestWithCompletion,
  grouped: boolean,
  familyWide: boolean,
  accent: ReturnType<typeof memberAccentStyle>,
  displayStatus: QuestFulfillmentStatus,
): string {
  if (grouped || familyWide) {
    return questStatusSurfaceClass(displayStatus)
  }
  return accent.cardClass
}

function resolveQuestCardDisplay(input: {
  quest: QuestWithCompletion
  session: FamilySession | null
  canAdmin: boolean
  groupAssignee?: QuestAssignee
}): { status: QuestFulfillmentStatus; badge: { text: string; className: string }; showConfirmAction: boolean } {
  const perspective = input.groupAssignee
    ? questConfirmationPerspectiveForMemberOnQuest({
        quest: input.quest,
        memberType: input.groupAssignee.type,
        memberId: input.groupAssignee.id,
        session: input.session,
        canAdmin: input.canAdmin,
      })
    : questConfirmationPerspectiveForSessionOnQuest(input.quest, input.session, input.canAdmin)

  if (perspective) {
    return {
      status: 'awaiting_creator',
      badge: QUEST_CONFIRMATION_PERSPECTIVE_BADGE[perspective],
      showConfirmAction: perspective === 'confirmer_action',
    }
  }

  if (input.groupAssignee) {
    const memberStatus = fulfillmentForMemberOnQuest(
      input.quest,
      input.groupAssignee.type,
      input.groupAssignee.id,
    )
    if (memberStatus === 'awaiting_creator') {
      return { status: 'open', badge: QUEST_STATUS_BADGE_CLASS.open, showConfirmAction: false }
    }
    return {
      status: memberStatus,
      badge: QUEST_STATUS_BADGE_CLASS[memberStatus],
      showConfirmAction: false,
    }
  }

  if (input.quest.fulfillmentStatus === 'awaiting_creator') {
    return { status: 'open', badge: QUEST_STATUS_BADGE_CLASS.open, showConfirmAction: false }
  }

  return {
    status: input.quest.fulfillmentStatus,
    badge: QUEST_STATUS_BADGE_CLASS[input.quest.fulfillmentStatus],
    showConfirmAction: false,
  }
}

export default function QuestCard({
  quest,
  children,
  parents = [],
  grouped = false,
  familyWide = false,
  familyAccentKey,
  manageable = false,
  manageMode,
  onManage,
  session = null,
  canAdmin = false,
  groupAssignee,
}: QuestCardProps) {
  const assignee = questPrimaryAssignee(quest)
  const assigneeName = assignee ? memberLabelForAssignee(assignee, parents, children) : '—'
  const dayLabel = formatQuestDayLabel(quest.task_date)
  const cardDisplay = resolveQuestCardDisplay({ quest, session, canAdmin, groupAssignee })
  const pendingConfirmations = pendingConfirmableCompletions(quest, session, canAdmin)
  const accent =
    familyWide || isFamilyWideQuest(quest)
      ? memberAccentStyle(familyAccentKey ?? 'lavender')
      : memberAccentStyle(accentKeyForAssignee(assignee, parents, children))

  const surfaceClass = cardShellClass(quest, grouped, familyWide, accent, cardDisplay.status)

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-white/65 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-950 dark:bg-slate-900/55 dark:text-slate-200">
            {dayLabel}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cardDisplay.badge.className}`}
          >
            {cardDisplay.badge.text}
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-slate-900/60 dark:text-emerald-300">
          +{quest.xp_reward} XP
        </span>
      </div>

      {grouped ? (
        <h3 className="mt-2 text-lg font-bold leading-snug text-slate-900 dark:text-slate-100">{quest.title}</h3>
      ) : (
        <div className="mt-2 flex min-w-0 items-baseline gap-1.5">
          <p className={`shrink-0 text-sm font-bold leading-snug ${accent.nameClass}`}>{assigneeName}</p>
          <span className="text-slate-950 dark:text-slate-500" aria-hidden>
            ·
          </span>
          <h3 className="min-w-0 line-clamp-2 text-base font-bold leading-snug text-slate-900 dark:text-slate-100">
            {quest.title}
          </h3>
        </div>
      )}

      {quest.description ? (
        <p className="mt-1.5 line-clamp-3 text-base font-bold leading-snug text-slate-950 dark:text-slate-200">
          {quest.description}
        </p>
      ) : null}

      <p className="mt-1.5 text-[11px] text-slate-950/95 dark:text-slate-400/90">
        von {questCreatorLabel(quest, parents, children)}
      </p>
      {manageable ? (
        <p className="mt-1 text-[10px] font-semibold text-slate-950 dark:text-slate-400">
          {manageMode === 'delete' ? 'Tippen zum Entfernen' : 'Tippen zum Bearbeiten'}
        </p>
      ) : null}
      {cardDisplay.showConfirmAction
        ? pendingConfirmations.map((row) => (
        <QuestFinalConfirmButton
          key={row.id}
          completionId={row.id}
          xpReward={quest.xp_reward}
          assigneeName={assigneeDisplayNameFromCompletion(
            row.childId,
            row.parentId,
            parents,
            children,
            formatParentDisplayName,
          )}
          compact
        />
      ))
        : null}
    </>
  )

  if (manageable && onManage && pendingConfirmations.length === 0) {
    return (
      <button
        type="button"
        onClick={onManage}
        className={`w-full rounded-xl border-2 p-3 text-left transition-[transform,box-shadow,filter] duration-200 hover:brightness-[1.02] active:scale-[0.988] ${surfaceClass}`}
      >
        {content}
      </button>
    )
  }

  return (
    <article className={`rounded-xl border-2 p-3 ${surfaceClass}`}>
      {content}
      {manageable && onManage ? (
        <button
          type="button"
          onClick={onManage}
          className="mt-2 text-[10px] font-semibold text-slate-950 underline dark:text-slate-400"
        >
          {manageMode === 'delete' ? 'Entfernen' : 'Bearbeiten'}
        </button>
      ) : null}
    </article>
  )
}
