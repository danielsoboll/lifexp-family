'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { portraitSrc, type AvatarPortraitId } from '../lib/family/memberAvatar'
import { useVisualViewportLayout } from '../lib/useVisualViewportLayout'
import { PILL_BACK_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

type MemberAvatarSelectScreenProps = {
  open: boolean
  onClose: () => void
  options: readonly AvatarPortraitId[]
  optionGroups?: readonly (readonly AvatarPortraitId[])[]
  value: AvatarPortraitId | null
  onChange: (portraitId: AvatarPortraitId) => void
  title?: string
}

export default function MemberAvatarSelectScreen({
  open,
  onClose,
  options,
  optionGroups,
  value,
  onChange,
  title = 'Avatar wählen',
}: MemberAvatarSelectScreenProps) {
  const [mounted, setMounted] = useState(false)
  const { keyboardOpen, keyboardHeight } = useVisualViewportLayout()

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

  useEffect(() => {
    if (!open) return

    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'

    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
    }
  }, [open])

  if (!open || !mounted) return null

  const groups = optionGroups && optionGroups.length > 0 ? optionGroups : [options]
  const scrollPaddingBottom = keyboardOpen
    ? `${Math.max(keyboardHeight + 24, 96)}px`
    : 'max(2rem, env(safe-area-inset-bottom))'

  return createPortal(
    <div
      className="fixed inset-0 z-[125] flex h-dvh max-h-dvh flex-col overflow-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200/90 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-avatar-select-title"
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-lg flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="mb-4 flex shrink-0 items-center gap-3">
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

        <p className="mb-3 shrink-0 text-sm leading-relaxed text-slate-950 dark:text-slate-400">
          Dein Avatar wird im Laufe des Tages glücklicher — je mehr XP du sammelst, desto fröhlicher das Gesicht.
        </p>

        <div
          className="lifexp-admin-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y"
          style={{ paddingBottom: scrollPaddingBottom }}
        >
          {groups.map((group, groupIndex) => (
            <div
              key={groupIndex}
              className={
                groupIndex > 0
                  ? 'mt-4 border-t border-slate-200/80 pt-4 dark:border-slate-700/80'
                  : undefined
              }
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {group.map((option) => {
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
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
