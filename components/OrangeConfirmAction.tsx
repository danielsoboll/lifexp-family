'use client'

import { useEffect, useRef, useState } from 'react'

import {
  ORANGE_CONFIRM_CANCEL_CLASS,
  ORANGE_CONFIRM_PANEL_CLASS,
  ORANGE_CONFIRM_TRIGGER_CLASS,
  ORANGE_CONFIRM_YES_CLASS,
} from '../lib/orangeConfirmStyles'

type OrangeConfirmActionProps = {
  triggerLabel: string
  confirmTitle: string
  confirmDescription: string
  onConfirm: () => boolean | void | Promise<boolean | void>
  busy?: boolean
  error?: string | null
}

export default function OrangeConfirmAction({
  triggerLabel,
  confirmTitle,
  confirmDescription,
  onConfirm,
  busy = false,
  error = null,
}: OrangeConfirmActionProps) {
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
        className={`${ORANGE_CONFIRM_PANEL_CLASS} mb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)))] scroll-mt-6`}
      >
        <p className="text-sm font-bold text-orange-950 dark:text-orange-100">{confirmTitle}</p>
        <p className="mt-2 text-xs leading-relaxed text-orange-900 dark:text-orange-200">{confirmDescription}</p>
        {error ? (
          <p className="mt-2 text-xs text-orange-800 dark:text-orange-300" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setOpen(false)} className={ORANGE_CONFIRM_CANCEL_CLASS} disabled={busy}>
            Nein
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            className={ORANGE_CONFIRM_YES_CLASS}
            disabled={busy}
          >
            {busy ? '…' : 'Ja'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button type="button" onClick={() => setOpen(true)} className={ORANGE_CONFIRM_TRIGGER_CLASS}>
      {triggerLabel}
    </button>
  )
}
