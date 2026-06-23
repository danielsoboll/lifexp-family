'use client'

import { useCallback, useState } from 'react'

import MemberAvatarSelectScreen from './MemberAvatarSelectScreen'
import MemberPortraitThumb from './MemberPortraitThumb'
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
  legend?: string
}

export default function MemberAvatarPicker({
  resolved,
  value,
  onChange,
  disabled = false,
  legend = 'Portrait',
}: MemberAvatarPickerProps) {
  const [screenOpen, setScreenOpen] = useState(false)
  const closeScreen = useCallback(() => setScreenOpen(false), [])

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

  const selected = value && resolved.options.includes(value) ? value : resolved.portraitId
  const canChange = !disabled && resolved.options.length > 1

  return (
    <>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">{legend}</p>
        {canChange ? (
          <button
            type="button"
            onClick={() => setScreenOpen(true)}
            aria-label={`${legend} ändern`}
            className={`${PRESSABLE_3D_CLASS} group flex flex-col items-start gap-1 rounded-xl border-2 border-transparent p-0.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600`}
          >
            <MemberPortraitThumb src={selected ? portraitSrc(selected) : null} className="ring-2 ring-slate-300/80 group-hover:ring-emerald-400/70 dark:ring-slate-600/80" />
            <span className="text-[11px] font-medium text-emerald-700 underline decoration-emerald-600/40 underline-offset-2 dark:text-emerald-300">
              Tippen zum Ändern
            </span>
          </button>
        ) : (
          <MemberPortraitThumb src={selected ? portraitSrc(selected) : null} />
        )}
      </div>

      <MemberAvatarSelectScreen
        open={screenOpen}
        onClose={closeScreen}
        options={resolved.options}
        value={selected}
        onChange={onChange}
        title={legend}
      />
    </>
  )
}
