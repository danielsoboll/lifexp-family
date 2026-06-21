'use client'

import { memberLabelForAssignee } from './MemberSingleSelect'
import type { ParentMember } from '../lib/family/members'
import type { ChildWithTodayXp, QuestWithCompletion } from '../lib/family/types'
import { questPrimaryAssignee } from '../lib/family/quests'
import { isFamilyWideQuest } from '../lib/family/questConfirmation'
import { formatQuestDayLabel } from '../lib/family/questRules'
import { accentKeyForAssignee, memberAccentStyle, type MemberAccentKey } from '../lib/family/memberAccentColor'
import { formatParentDisplayName } from '../lib/family/familyDisplayName'

type QuestCardProps = {
  quest: QuestWithCompletion
  children: ChildWithTodayXp[]
  parents?: ParentMember[]
  /** Name steht in der Gruppenüberschrift — nicht nochmal auf der Karte. */
  grouped?: boolean
  /** Familien-Quest (Alle) — neutrale Kartenfarbe. */
  familyWide?: boolean
  familyAccentKey?: MemberAccentKey
  /** Nur Ersteller: Klick öffnet Bearbeiten/Löschen. */
  manageable?: boolean
  onManage?: () => void
}

const STATUS_LABEL = {
  open: { text: 'Offen', className: 'bg-white/70 text-slate-800 dark:bg-slate-800/70 dark:text-slate-200' },
  awaiting_creator: {
    text: 'Wartet auf Bestätigung',
    className: 'bg-white/75 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100',
  },
  done: {
    text: 'Erledigt',
    className: 'bg-white/75 text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-100',
  },
} as const

function creatorLabel(
  quest: QuestWithCompletion,
  parents: ParentMember[],
  children: ChildWithTodayXp[],
): string {
  if (quest.created_by_child_id) {
    const child = children.find((c) => c.id === quest.created_by_child_id)
    return child?.display_name ?? 'Kind'
  }
  if (quest.created_by) {
    const parent = parents.find((p) => p.id === quest.created_by)
    return parent ? formatParentDisplayName(parent.display_name, parent.gender) : 'Erwachsene'
  }
  return 'Familie'
}

export default function QuestCard({
  quest,
  children,
  parents = [],
  grouped = false,
  familyWide = false,
  familyAccentKey,
  manageable = false,
  onManage,
}: QuestCardProps) {
  const assignee = questPrimaryAssignee(quest)
  const assigneeName = assignee ? memberLabelForAssignee(assignee, parents, children) : '—'
  const dayLabel = formatQuestDayLabel(quest.task_date)
  const status = STATUS_LABEL[quest.fulfillmentStatus]
  const accent =
    familyWide || isFamilyWideQuest(quest)
      ? memberAccentStyle(familyAccentKey ?? 'lavender')
      : memberAccentStyle(accentKeyForAssignee(assignee, parents, children))

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-white/65 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:bg-slate-900/55 dark:text-slate-200">
            {dayLabel}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${status.className}`}
          >
            {status.text}
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-slate-900/60 dark:text-emerald-300">
          +{quest.xp_reward} XP
        </span>
      </div>

      {grouped ? (
        <h3 className="mt-2 text-base font-bold leading-snug text-slate-900 dark:text-slate-100">{quest.title}</h3>
      ) : (
        <div className="mt-2 flex min-w-0 items-baseline gap-1.5">
          <p className={`shrink-0 text-sm font-bold leading-snug ${accent.nameClass}`}>{assigneeName}</p>
          <span className="text-slate-400 dark:text-slate-500" aria-hidden>
            ·
          </span>
          <h3 className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{quest.title}</h3>
        </div>
      )}

      {quest.description ? (
        <p className="mt-1 line-clamp-2 text-sm text-slate-700/90 dark:text-slate-300/90">{quest.description}</p>
      ) : null}

      <p className="mt-1.5 text-[11px] text-slate-950/95 dark:text-slate-400/90">
        von {creatorLabel(quest, parents, children)}
      </p>
      {manageable ? (
        <p className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">Tippen zum Bearbeiten</p>
      ) : null}
    </>
  )

  if (manageable && onManage) {
    return (
      <button
        type="button"
        onClick={onManage}
        className={`w-full rounded-xl border-2 p-3 text-left shadow-sm ring-1 transition hover:brightness-[1.02] active:scale-[0.99] ${accent.cardClass}`}
      >
        {content}
      </button>
    )
  }

  return <article className={`rounded-xl border-2 p-3 shadow-sm ring-1 ${accent.cardClass}`}>{content}</article>
}
