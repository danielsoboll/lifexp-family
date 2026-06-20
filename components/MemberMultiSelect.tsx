'use client'

import { useMemo, useState } from 'react'

import type { ParentMember } from '../lib/family/members'
import type { ChildWithTodayXp, QuestAssignee } from '../lib/family/types'
import { formatParentDisplayName } from '../lib/family/familyDisplayName'
import { CARD_SURFACE_CLASS } from '../lib/appShell'

export type FamilyMemberOption = {
  type: 'parent' | 'child'
  id: string
  label: string
}

type MemberMultiSelectProps = {
  parents: ParentMember[]
  children: ChildWithTodayXp[]
  value: QuestAssignee[]
  onChange: (next: QuestAssignee[]) => void
}

function toKey(type: 'parent' | 'child', id: string): string {
  return `${type}:${id}`
}

export function buildMemberOptions(parents: ParentMember[], children: ChildWithTodayXp[]): FamilyMemberOption[] {
  return [
    ...parents.map((p) => ({ type: 'parent' as const, id: p.id, label: formatParentDisplayName(p.display_name, p.gender) })),
    ...children.map((c) => ({ type: 'child' as const, id: c.id, label: c.display_name })),
  ]
}

export default function MemberMultiSelect({ parents, children, value, onChange }: MemberMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const options = useMemo(() => buildMemberOptions(parents, children), [parents, children])
  const selectedKeys = useMemo(() => new Set(value.map((v) => toKey(v.type, v.id))), [value])

  const label =
    value.length === 0
      ? 'Alle Kinder (Standard)'
      : value.map((v) => options.find((o) => o.type === v.type && o.id === v.id)?.label ?? '?').join(', ')

  const toggle = (option: FamilyMemberOption) => {
    const key = toKey(option.type, option.id)
    if (selectedKeys.has(key)) {
      onChange(value.filter((v) => toKey(v.type, v.id) !== key))
      return
    }
    onChange([...value, { type: option.type, id: option.id }])
  }

  return (
    <div className="relative">
      <label className="mb-1 block text-sm font-semibold">Familienmitglieder</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${CARD_SURFACE_CLASS} w-full rounded-xl px-3 py-2.5 text-left text-sm text-slate-900 dark:text-slate-100`}
      >
        {label}
      </button>
      {open ? (
        <div className={`${CARD_SURFACE_CLASS} absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl p-2 shadow-lg`}>
          {options.length === 0 ? (
            <p className="px-2 py-1 text-xs text-slate-500">Noch keine Familienmitglieder.</p>
          ) : (
            options.map((option) => {
              const key = toKey(option.type, option.id)
              const checked = selectedKeys.has(key)
              return (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                >
                  <input type="checkbox" checked={checked} onChange={() => toggle(option)} className="h-4 w-4 rounded" />
                  <span>
                    {option.label}{' '}
                    <span className="text-xs text-slate-500">({option.type === 'parent' ? 'Elternteil' : 'Kind'})</span>
                  </span>
                </label>
              )
            })
          )}
          <button
            type="button"
            onClick={() => {
              onChange([])
              setOpen(false)
            }}
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300"
          >
            Alle Kinder (Standard)
          </button>
        </div>
      ) : null}
    </div>
  )
}
