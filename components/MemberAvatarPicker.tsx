'use client'

import {
  portraitSrc,
  type AvatarPortraitId,
  type ResolvedMemberAvatar,
} from '../lib/family/memberAvatar'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type MemberAvatarPickerProps = {
  resolved: ResolvedMemberAvatar
  value: AvatarPortraitId | null
  onChange: (portraitId: AvatarPortraitId) => void
  disabled?: boolean
}

export default function MemberAvatarPicker({
  resolved,
  value,
  onChange,
  disabled = false,
}: MemberAvatarPickerProps) {
  if (resolved.error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        {resolved.error}
      </div>
    )
  }

  if (resolved.options.length === 0) {
    return (
      <p className="text-sm text-slate-950 dark:text-slate-400">Kein Portrait für diese Kombination verfügbar.</p>
    )
  }

  if (resolved.options.length <= 1) {
    return null
  }

  const selected = value && resolved.options.includes(value) ? value : resolved.portraitId

  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Portrait</legend>
      <div className="grid grid-cols-3 gap-2">
        {resolved.options.map((option) => {
          const isSelected = selected === option
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(option)}
              className={`${PRESSABLE_3D_CLASS} overflow-hidden rounded-xl border-2 ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-400/50'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              <div className="aspect-[3/4] w-full bg-slate-100 dark:bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={portraitSrc(option)}
                  alt=""
                  className="h-full w-full object-cover object-top"
                />
              </div>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
