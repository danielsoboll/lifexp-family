'use client'

import { useEffect, useRef, useState } from 'react'

import {
  DANGER_CONFIRM_CANCEL_CLASS,
  DANGER_CONFIRM_PANEL_CLASS,
  DANGER_CONFIRM_TRIGGER_CLASS,
  DANGER_CONFIRM_YES_CLASS,
} from '../lib/dangerConfirmStyles'

type DangerConfirmActionProps = {
  triggerLabel: string
  confirmTitle: string
  confirmDescription: string
  onConfirm: () => boolean | void | Promise<boolean | void>
  busy?: boolean
  error?: string | null
}

export default function DangerConfirmAction({
  triggerLabel,
  confirmTitle,
  confirmDescription,
  onConfirm,
  busy = false,
  error = null,
}: DangerConfirmActionProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const node = panelRef.current
    if (!node) return

    const scrollPanelIntoView = () => {
      node.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }

    scrollPanelIntoView()
    requestAnimationFrame(scrollPanelIntoView)
    window.setTimeout(scrollPanelIntoView, 150)
  }, [open])

  const handleConfirm = async () => {
    const ok = await onConfirm()
    if (ok !== false) setOpen(false)
  }

  if (open) {
    return (
      <div
        ref={panelRef}
        className={`${DANGER_CONFIRM_PANEL_CLASS} mb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)))] scroll-mt-6`}
      >
        <p className="text-sm font-bold text-red-950 dark:text-red-100">{confirmTitle}</p>
        <p className="mt-2 text-xs leading-relaxed text-red-800 dark:text-red-200">{confirmDescription}</p>
        {error ? (
          <p className="mt-2 text-xs text-red-700 dark:text-red-300" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setOpen(false)} className={DANGER_CONFIRM_CANCEL_CLASS} disabled={busy}>
            Nein
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            className={DANGER_CONFIRM_YES_CLASS}
            disabled={busy}
          >
            {busy ? '…' : 'Ja'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button type="button" onClick={() => setOpen(true)} className={DANGER_CONFIRM_TRIGGER_CLASS}>
      {triggerLabel}
    </button>
  )
}
