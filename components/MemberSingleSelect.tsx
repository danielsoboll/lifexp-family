'use client'

import { useMemo } from 'react'

import type { ParentMember } from '../lib/family/members'
import type { ChildWithTodayXp, QuestAssignee } from '../lib/family/types'
import { formatParentDisplayName } from '../lib/family/familyDisplayName'
import { buildMemberOptions } from './MemberMultiSelect'
import { CARD_SURFACE_CLASS } from '../lib/appShell'

type MemberSingleSelectProps = {
  parents: ParentMember[]
  children: ChildWithTodayXp[]
  value: QuestAssignee | null
  onChange: (next: QuestAssignee | null) => void
  excludeMember?: QuestAssignee | null
}

export default function MemberSingleSelect({
  parents,
  children,
  value,
  onChange,
  excludeMember,
}: MemberSingleSelectProps) {
  const options = useMemo(() => {
    const all = buildMemberOptions(parents, children)
    if (!excludeMember) return all
    return all.filter((o) => !(o.type === excludeMember.type && o.id === excludeMember.id))
  }, [parents, children, excludeMember])

  const selectedKey = value ? `${value.type}:${value.id}` : ''

  return (
    <div>
      <label htmlFor="quest-assignee" className="mb-1 block text-sm font-semibold">
        Für wen?
      </label>
      <select
        id="quest-assignee"
        required
        value={selectedKey}
        onChange={(event) => {
          const key = event.target.value
          if (!key) {
            onChange(null)
            return
          }
          const option = options.find((o) => `${o.type}:${o.id}` === key)
          if (option) onChange({ type: option.type, id: option.id })
        }}
        className={`${CARD_SURFACE_CLASS} w-full rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100`}
      >
        <option value="">Familienmitglied wählen …</option>
        {options.map((option) => (
          <option key={`${option.type}:${option.id}`} value={`${option.type}:${option.id}`}>
            {option.label} ({option.type === 'parent' ? 'Erwachsene' : 'Kind'})
          </option>
        ))}
      </select>
      {options.length === 0 ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Keine anderen Familienmitglieder — Quests sind immer für jemand anderen.
        </p>
      ) : null}
    </div>
  )
}

export function memberLabelForAssignee(
  assignee: QuestAssignee,
  parents: ParentMember[],
  children: ChildWithTodayXp[],
): string {
  if (assignee.type === 'parent') {
    const parent = parents.find((p) => p.id === assignee.id)
    return parent ? formatParentDisplayName(parent.display_name, parent.gender) : 'Erwachsene'
  }
  const child = children.find((c) => c.id === assignee.id)
  return child?.display_name ?? 'Kind'
}
