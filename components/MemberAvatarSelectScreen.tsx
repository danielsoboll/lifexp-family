'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { portraitSrc, type AvatarPortraitId } from '../lib/family/memberAvatar'
import { MAIN_PAGE_INSET_CLASS, MAIN_SHELL_CLASS, PILL_BACK_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

type MemberAvatarSelectScreenProps = {
  open: boolean
  onClose: () => void
  options: readonly AvatarPortraitId[]
  value: AvatarPortraitId | null
  onChange: (portraitId: AvatarPortraitId) => void
  title?: string
}

export default function MemberAvatarSelectScreen({
  open,
  onClose,
  options,
  value,
  onChange,
  title = 'Avatar wählen',
}: MemberAvatarSelectScreenProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className={`${MAIN_SHELL_CLASS} fixed inset-0 z-[125] flex flex-col overscroll-none bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200/90 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-avatar-select-title"
    >
      <div className={`mx-auto flex w-full max-w-lg flex-1 flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <div className="mb-4 flex items-center gap-3">
          <button type="button" onClick={onClose} className={`${PILL_BACK_CLASS} mb-0 shrink-0`}>
            <span aria-hidden>←</span>
            Zurück
          </button>
          <h1
            id="member-avatar-select-title"
            className="min-w-0 flex-1 text-lg font-bold text-slate-900 dark:text-slate-100"
          >
            {title}
          </h1>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {options.map((option) => {
              const isSelected = value === option
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    onChange(option)
                    onClose()
                  }}
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
        </div>
      </div>
    </div>,
    document.body,
  )
}
