'use client'

import { useMemo, useState } from 'react'

import type { ParentMember } from '../lib/family/members'
import type { ChildWithTodayXp, QuestAssignee } from '../lib/family/types'
import { formatParentDisplayName } from '../lib/family/familyDisplayName'
import { resolveChildAvatar, resolveParentAvatar } from '../lib/family/memberAvatar'
import { buildMemberOptions, type FamilyMemberOption } from './MemberMultiSelect'
import MemberPortraitMini from './MemberPortraitMini'
import { CARD_SURFACE_CLASS } from '../lib/appShell'

type MemberSingleSelectProps = {
  parents: ParentMember[]
  children: ChildWithTodayXp[]
  value: QuestAssignee | null
  onChange: (next: QuestAssignee | null) => void
  excludeMember?: QuestAssignee | null
}

function avatarForOption(
  option: FamilyMemberOption,
  parents: ParentMember[],
  children: ChildWithTodayXp[],
): { src: string | null; error: string | null } {
  if (option.type === 'parent') {
    const parent = parents.find((p) => p.id === option.id)
    if (!parent) return { src: null, error: null }
    return resolveParentAvatar(parent.gender, parent.avatar_url, { todayXp: parent.todayXp })
  }
  const child = children.find((c) => c.id === option.id)
  if (!child) return { src: null, error: null }
  return resolveChildAvatar(child.gender, child.age, child.portrait_id, { todayXp: child.todayXp })
}

function MemberOptionRow({
  option,
  parents,
  children,
  selected,
  onPick,
}: {
  option: FamilyMemberOption
  parents: ParentMember[]
  children: ChildWithTodayXp[]
  selected: boolean
  onPick: () => void
}) {
  const avatar = avatarForOption(option, parents, children)

  return (
    <button
      type="button"
      onClick={onPick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left text-sm transition-colors ${
        selected
          ? 'bg-emerald-100/90 dark:bg-emerald-950/50'
          : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
      }`}
    >
      <MemberPortraitMini src={avatar.src} error={avatar.error} className="!w-8" />
      <span className="min-w-0 flex-1 font-semibold text-slate-900 dark:text-slate-100">{option.label}</span>
      {selected ? (
        <span className="shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-300" aria-hidden>
          ✓
        </span>
      ) : null}
    </button>
  )
}

export default function MemberSingleSelect({
  parents,
  children,
  value,
  onChange,
  excludeMember,
}: MemberSingleSelectProps) {
  const [open, setOpen] = useState(false)

  const options = useMemo(() => {
    const all = buildMemberOptions(parents, children)
    if (!excludeMember) return all
    return all.filter((o) => !(o.type === excludeMember.type && o.id === excludeMember.id))
  }, [parents, children, excludeMember])

  const selectedOption = useMemo(() => {
    if (!value) return null
    return options.find((o) => o.type === value.type && o.id === value.id) ?? null
  }, [options, value])

  const selectedAvatar = selectedOption ? avatarForOption(selectedOption, parents, children) : null

  return (
    <div className="relative">
      <label className="mb-1 block text-sm font-semibold">Für wen?</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${CARD_SURFACE_CLASS} flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-slate-900 dark:text-slate-100`}
      >
        {selectedOption && selectedAvatar ? (
          <>
            <MemberPortraitMini src={selectedAvatar.src} error={selectedAvatar.error} className="!w-8" />
            <span className="min-w-0 flex-1 font-semibold">{selectedOption.label}</span>
          </>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">Familienmitglied wählen …</span>
        )}
        <span className="ml-auto shrink-0 text-slate-400" aria-hidden>
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open ? (
        <div className={`${CARD_SURFACE_CLASS} absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl p-1.5 shadow-lg`}>
          {options.length === 0 ? (
            <p className="px-2 py-2 text-xs text-slate-500 dark:text-slate-400">
              Keine anderen Familienmitglieder — Quests sind immer für jemand anderen.
            </p>
          ) : (
            options.map((option) => {
              const selected = value?.type === option.type && value.id === option.id
              return (
                <MemberOptionRow
                  key={`${option.type}:${option.id}`}
                  option={option}
                  parents={parents}
                  children={children}
                  selected={selected}
                  onPick={() => {
                    onChange({ type: option.type, id: option.id })
                    setOpen(false)
                  }}
                />
              )
            })
          )}
        </div>
      ) : null}

      {options.length === 0 && !open ? (
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
