'use client'

import { useMemo } from 'react'

import FamilyGroupPortrait from './FamilyGroupPortrait'
import MemberPortraitMini from './MemberPortraitMini'
import type { ParentMember } from '../lib/family/members'
import type { ChildWithTodayXp, QuestAssignee } from '../lib/family/types'
import { resolveChildAvatar, resolveParentAvatar } from '../lib/family/memberAvatar'
import { buildAllFamilyAssignees, buildOrderedAssigneeOptions } from '../lib/family/questMemberGroups'
import { CARD_SURFACE_CLASS } from '../lib/appShell'

const ASSIGNEE_SELECTED_CLASS =
  'border-2 border-emerald-600 bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-900/25 ring-2 ring-emerald-300/60 dark:border-emerald-500 dark:from-emerald-600 dark:via-emerald-700 dark:to-emerald-800 dark:ring-emerald-600/50'

const ASSIGNEE_UNSELECTED_CLASS =
  'border-2 border-transparent hover:bg-slate-200/60 dark:hover:bg-slate-800/60'

function AssigneeSelectedBadge() {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/25 text-lg font-bold leading-none text-white ring-2 ring-white/50"
      aria-hidden
    >
      ✓
    </span>
  )
}

export type QuestAssigneeChoice =
  | { mode: 'one'; assignee: QuestAssignee }
  | { mode: 'many'; assignees: QuestAssignee[] }
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
  if (value?.mode === 'all') return true
  if (value?.mode === 'many') {
    return value.assignees.some((row) => row.type === option.type && row.id === option.id)
  }
  return value?.mode === 'one' && value.assignee.type === option.type && value.assignee.id === option.id
}

function toggleAllOption(value: QuestAssigneeChoice | null): QuestAssigneeChoice | null {
  if (value?.mode === 'all') return null
  return { mode: 'all' }
}

function toggleAssignee(
  value: QuestAssigneeChoice | null,
  assignee: QuestAssignee,
  allOptionAssignees: QuestAssignee[],
): QuestAssigneeChoice {
  if (value?.mode === 'all') {
    const next = allOptionAssignees.filter((row) => row.type !== assignee.type || row.id !== assignee.id)
    return { mode: 'many', assignees: next }
  }

  const current =
    value?.mode === 'many' ? value.assignees : value?.mode === 'one' ? [value.assignee] : []

  const exists = current.some((row) => row.type === assignee.type && row.id === assignee.id)
  const next = exists
    ? current.filter((row) => row.type !== assignee.type || row.id !== assignee.id)
    : [...current, assignee]

  return { mode: 'many', assignees: next }
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

  const allOptionAssignees = useMemo(
    () => options.map((option) => ({ type: option.type, id: option.id }) as QuestAssignee),
    [options],
  )

  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold">Für wen?</label>
      <div className={`${CARD_SURFACE_CLASS} space-y-1 rounded-xl p-1.5`}>
        {options.length === 0 ? (
          <p className="px-2 py-2 text-xs text-slate-950 dark:text-slate-400">
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
                aria-pressed={selected}
                onClick={() => onChange(toggleAssignee(value, assignee, allOptionAssignees))}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm transition-[border-color,background-color,box-shadow,color] ${
                  selected ? ASSIGNEE_SELECTED_CLASS : ASSIGNEE_UNSELECTED_CLASS
                }`}
              >
                <MemberPortraitMini
                  src={avatar.src}
                  error={avatar.error}
                  className={`!w-9 ${selected ? 'ring-2 ring-white/70' : ''}`}
                />
                <span
                  className={`min-w-0 flex-1 font-semibold ${selected ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}
                >
                  {option.label}
                </span>
                {selected ? <AssigneeSelectedBadge /> : null}
              </button>
            )
          })
        )}

        {showAllOption ? (
          <button
            type="button"
            aria-pressed={value?.mode === 'all'}
            onClick={() => onChange(toggleAllOption(value))}
            className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-[border-color,background-color,box-shadow,color] ${
              value?.mode === 'all' ? ASSIGNEE_SELECTED_CLASS : ASSIGNEE_UNSELECTED_CLASS
            }`}
          >
            <FamilyGroupPortrait
              className={`w-[4.5rem] shrink-0 ${value?.mode === 'all' ? 'ring-2 ring-white/70' : ''}`}
            />
            <span className="min-w-0 flex-1">
              <span
                className={`block text-sm font-bold ${value?.mode === 'all' ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}
              >
                Alle
              </span>
              <span
                className={`mt-0.5 block text-xs ${value?.mode === 'all' ? 'text-emerald-50/95' : 'text-slate-950 dark:text-slate-400'}`}
              >
                Gleiche Quest für die ganze Familie — dich eingeschlossen
              </span>
            </span>
            {value?.mode === 'all' ? <AssigneeSelectedBadge /> : null}
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
  if (choice.mode === 'many') return choice.assignees
  return buildAllFamilyAssignees(parents, children)
}

export function questAssigneeChoiceFromQuest(
  quest: {
    assignees: QuestAssignee[]
    child_id?: string | null
  },
  context?: { parents: ParentMember[]; children: ChildWithTodayXp[] },
): QuestAssigneeChoice | null {
  const assignees =
    quest.assignees.length > 0
      ? quest.assignees
      : quest.child_id
        ? [{ type: 'child' as const, id: quest.child_id }]
        : []

  if (context && assignees.length > 0) {
    const allFamily = buildAllFamilyAssignees(context.parents, context.children)
    const isEveryone =
      assignees.length === allFamily.length &&
      assignees.every((row) =>
        allFamily.some((member) => member.type === row.type && member.id === row.id),
      )
    if (isEveryone) return { mode: 'all' }
  }

  return questAssigneeChoiceFromAssignees(assignees)
}

export function questAssigneeChoiceFromAssignees(assignees: QuestAssignee[]): QuestAssigneeChoice | null {
  if (assignees.length === 0) return null
  return { mode: 'many', assignees }
}
