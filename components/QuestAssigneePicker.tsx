'use client'

import { useMemo } from 'react'

import FamilyGroupPortrait from './FamilyGroupPortrait'
import MemberPortraitMini from './MemberPortraitMini'
import type { ParentMember } from '../lib/family/members'
import type { ChildWithTodayXp, QuestAssignee } from '../lib/family/types'
import { resolveChildAvatar, resolveParentAvatar } from '../lib/family/memberAvatar'
import { buildAllFamilyAssignees, buildOrderedAssigneeOptions } from '../lib/family/questMemberGroups'
import { CARD_SURFACE_CLASS } from '../lib/appShell'

export type QuestAssigneeChoice =
  | { mode: 'one'; assignee: QuestAssignee }
  | { mode: 'all' }

type QuestAssigneePickerProps = {
  parents: ParentMember[]
  children: ChildWithTodayXp[]
  value: QuestAssigneeChoice | null
  onChange: (next: QuestAssigneeChoice | null) => void
  excludeMember?: QuestAssignee | null
}

function avatarForOption(
  option: { type: 'parent' | 'child'; id: string },
  parents: ParentMember[],
  children: ChildWithTodayXp[],
) {
  if (option.type === 'parent') {
    const parent = parents.find((p) => p.id === option.id)
    if (!parent) return { src: null, error: null }
    return resolveParentAvatar(parent.gender, parent.avatar_url, { todayXp: parent.todayXp })
  }
  const child = children.find((c) => c.id === option.id)
  if (!child) return { src: null, error: null }
  return resolveChildAvatar(child.gender, child.age, child.portrait_id, { todayXp: child.todayXp })
}

function isSelected(value: QuestAssigneeChoice | null, option: QuestAssignee): boolean {
  return value?.mode === 'one' && value.assignee.type === option.type && value.assignee.id === option.id
}

export default function QuestAssigneePicker({
  parents,
  children,
  value,
  onChange,
  excludeMember,
}: QuestAssigneePickerProps) {
  const options = useMemo(
    () => buildOrderedAssigneeOptions(parents, children, excludeMember),
    [parents, children, excludeMember],
  )

  const allMembersCount = useMemo(
    () => buildOrderedAssigneeOptions(parents, children, null).length,
    [parents, children],
  )

  const showAllOption = allMembersCount >= 2

  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold">Für wen?</label>
      <div className={`${CARD_SURFACE_CLASS} space-y-1 rounded-xl p-1.5`}>
        {options.length === 0 ? (
          <p className="px-2 py-2 text-xs text-slate-500 dark:text-slate-400">
            Keine anderen Familienmitglieder — Quests sind immer für jemand anderen.
          </p>
        ) : (
          options.map((option) => {
            const assignee: QuestAssignee = { type: option.type, id: option.id }
            const selected = isSelected(value, assignee)
            const avatar = avatarForOption(option, parents, children)
            return (
              <button
                key={`${option.type}:${option.id}`}
                type="button"
                onClick={() => onChange({ mode: 'one', assignee })}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left text-sm transition-colors ${
                  selected
                    ? 'bg-emerald-100/90 dark:bg-emerald-950/50'
                    : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <MemberPortraitMini src={avatar.src} error={avatar.error} className="!w-9" />
                <span className="min-w-0 flex-1 font-semibold text-slate-900 dark:text-slate-100">{option.label}</span>
                {selected ? (
                  <span className="shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-300" aria-hidden>
                    ✓
                  </span>
                ) : null}
              </button>
            )
          })
        )}

        {showAllOption ? (
          <button
            type="button"
            onClick={() => onChange({ mode: 'all' })}
            className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
              value?.mode === 'all'
                ? 'bg-emerald-100/90 dark:bg-emerald-950/50'
                : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <FamilyGroupPortrait className="w-[4.5rem] shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">Alle</span>
              <span className="mt-0.5 block text-xs text-slate-950 dark:text-slate-400">
                Gleiche Quest für die ganze Familie — dich eingeschlossen
              </span>
            </span>
            {value?.mode === 'all' ? (
              <span className="shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-300" aria-hidden>
                ✓
              </span>
            ) : null}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function assigneesFromChoice(
  choice: QuestAssigneeChoice | null,
  parents: ParentMember[],
  children: ChildWithTodayXp[],
  _excludeMember?: QuestAssignee | null,
): QuestAssignee[] {
  if (!choice) return []
  if (choice.mode === 'one') return [choice.assignee]
  return buildAllFamilyAssignees(parents, children)
}

export function questAssigneeChoiceFromQuest(quest: {
  assignees: QuestAssignee[]
  child_id?: string | null
}): QuestAssigneeChoice | null {
  if (quest.assignees.length > 1) return { mode: 'all' }
  const assignee = quest.assignees[0] ?? (quest.child_id ? { type: 'child' as const, id: quest.child_id } : null)
  if (!assignee) return null
  return { mode: 'one', assignee }
}
