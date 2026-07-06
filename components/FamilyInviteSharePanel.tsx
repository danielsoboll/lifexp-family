'use client'

import { useCallback, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

import {
  buildFamilyInviteLink,
  canUseNativeShare,
  copyFamilyInviteCode,
  copyFamilyInviteLink,
  shareFamilyInviteLink,
} from '../lib/family/inviteLink'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'
import { QUICK_CLICK_WAIT_HINT } from '../lib/quickClickFeedback'

type FamilyInviteSharePanelProps = {
  inviteCode: string
  familyName?: string | null
  /** Nach Klick auf „Familienmitglieder verknüpfen“ — goldene Aktions-Buttons. */
  actionsHighlighted?: boolean
  /** Teaser-Flow zuerst aktivieren (zeigt „Warte kurz …“). */
  ensureFlowReady?: () => Promise<void>
}

const ACTION_BUTTON_CLASS = `${PRESSABLE_3D_CLASS} rounded-xl border-2 border-slate-400 bg-gradient-to-b from-slate-100 to-slate-200/90 px-3 py-2 text-sm font-bold text-slate-950 transition-[border-color,background,color,box-shadow] duration-300 dark:border-slate-600 dark:from-slate-800 dark:to-slate-950 dark:text-slate-100`

const ACTION_BUTTON_GOLD_CLASS = `${PRESSABLE_3D_CLASS} rounded-xl border-2 border-amber-500/90 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 px-3 py-2 text-sm font-bold text-white shadow-[0_4px_14px_-6px_rgba(245,158,11,0.5)] transition-[border-color,background,color,box-shadow] duration-300 dark:border-amber-600/80 dark:from-amber-600 dark:via-orange-600 dark:to-amber-700`

const COPIED_LINK_HINT = 'Link kopiert — per SMS/WhatsApp versenden'
const COPIED_CODE_HINT = 'Code kopiert — per SMS/WhatsApp versenden'

export default function FamilyInviteSharePanel({
  inviteCode,
  familyName,
  actionsHighlighted = false,
  ensureFlowReady,
}: FamilyInviteSharePanelProps) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const [showCopiedLink, setShowCopiedLink] = useState(false)
  const [showCopiedCode, setShowCopiedCode] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [nativeShare, setNativeShare] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [busyButton, setBusyButton] = useState<'qr' | 'link' | 'secondary' | null>(null)

  useEffect(() => {
    setInviteLink(buildFamilyInviteLink(inviteCode))
    setNativeShare(canUseNativeShare())
  }, [inviteCode])

  const showCopiedLinkFeedback = useCallback(() => {
    setFeedback(COPIED_LINK_HINT)
    setShowCopiedLink(true)
    setShowCopiedCode(false)
    window.setTimeout(() => {
      setFeedback(null)
      setShowCopiedLink(false)
    }, 3500)
  }, [])

  const showCopiedCodeFeedback = useCallback(() => {
    setFeedback(COPIED_CODE_HINT)
    setShowCopiedCode(true)
    setShowCopiedLink(false)
    window.setTimeout(() => {
      setFeedback(null)
      setShowCopiedCode(false)
    }, 3500)
  }, [])

  const handleShare = useCallback(async () => {
    const result = await shareFamilyInviteLink({ inviteCode, familyName })
    if (result === 'shared') setFeedback('Teilen-Menü geöffnet')
    else if (result === 'failed') setFeedback('Teilen fehlgeschlagen')
  }, [inviteCode, familyName])

  const runInviteAction = useCallback(
    async (buttonKey: 'qr' | 'link' | 'secondary', action: () => void | Promise<void>) => {
      if (actionBusy) {
        setFeedback(QUICK_CLICK_WAIT_HINT)
        return
      }

      setActionBusy(true)
      setBusyButton(buttonKey)
      setFeedback(QUICK_CLICK_WAIT_HINT)
      setShowCopiedLink(false)
      setShowCopiedCode(false)

      try {
        if (ensureFlowReady) await ensureFlowReady()
        await action()
      } finally {
        setActionBusy(false)
        setBusyButton(null)
      }
    },
    [actionBusy, ensureFlowReady],
  )

  const handleCopyLinkClick = useCallback(() => {
    void runInviteAction('link', async () => {
      const ok = await copyFamilyInviteLink(inviteCode)
      if (ok) showCopiedLinkFeedback()
      else setFeedback('Kopieren fehlgeschlagen')
    })
  }, [inviteCode, runInviteAction, showCopiedLinkFeedback])

  const handleCopyCodeClick = useCallback(() => {
    void runInviteAction('secondary', async () => {
      const ok = await copyFamilyInviteCode(inviteCode)
      if (ok) showCopiedCodeFeedback()
      else setFeedback('Kopieren fehlgeschlagen')
    })
  }, [inviteCode, runInviteAction, showCopiedCodeFeedback])

  const handleShareClick = useCallback(() => {
    void runInviteAction('secondary', handleShare)
  }, [handleShare, runInviteAction])

  const handleQrOpen = useCallback(() => {
    void runInviteAction('qr', async () => {
      if (!inviteLink) {
        setFeedback(QUICK_CLICK_WAIT_HINT)
        return
      }
      setFeedback(null)
      setQrOpen(true)
    })
  }, [inviteLink, runInviteAction])

  const code = inviteCode.trim()
  if (!code) return null

  const actionButtonClass = actionsHighlighted ? ACTION_BUTTON_GOLD_CLASS : ACTION_BUTTON_CLASS

  return (
    <div
      className={`space-y-3 border-t pt-2 transition-[border-color] duration-300 ${
        actionsHighlighted ? 'border-amber-400/60 dark:border-amber-600/50' : 'border-slate-300/70 dark:border-slate-600/70'
      }`}
    >
      <div className="space-y-2">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-950 dark:text-slate-300">Einladungscode</p>
          <p className="font-mono text-sm font-semibold text-slate-950 dark:text-slate-100">{code}</p>
        </div>

        {inviteLink ? (
          <button
            type="button"
            onClick={handleQrOpen}
            disabled={actionBusy}
            className={`${actionButtonClass} w-full sm:w-auto disabled:cursor-wait disabled:opacity-90`}
          >
            {busyButton === 'qr' ? QUICK_CLICK_WAIT_HINT : 'QR-Code anzeigen'}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopyLinkClick}
          disabled={actionBusy}
          className={`${actionButtonClass} disabled:cursor-wait disabled:opacity-90`}
        >
          {busyButton === 'link' ? QUICK_CLICK_WAIT_HINT : 'Einladungslink kopieren'}
        </button>
        <button
          type="button"
          onClick={() => void (nativeShare ? handleShareClick() : handleCopyCodeClick())}
          disabled={actionBusy}
          className={`${actionButtonClass} disabled:cursor-wait disabled:opacity-90`}
        >
          {busyButton === 'secondary'
            ? QUICK_CLICK_WAIT_HINT
            : nativeShare
              ? 'Teilen …'
              : 'Code kopieren'}
        </button>
      </div>

      {feedback ? (
        <div className="space-y-1">
          <p
            className={`text-xs font-semibold ${
              feedback === QUICK_CLICK_WAIT_HINT
                ? 'text-amber-800 dark:text-amber-200'
                : 'text-emerald-700 dark:text-emerald-300'
            }`}
            role="status"
            aria-live="polite"
          >
            {feedback}
          </p>
          {showCopiedLink && inviteLink ? (
            <p className="break-all text-xs text-slate-950 dark:text-slate-400">{inviteLink}</p>
          ) : null}
          {showCopiedCode ? (
            <p className="font-mono text-xs font-semibold text-slate-950 dark:text-slate-100">{code}</p>
          ) : null}
        </div>
      ) : null}

      {qrOpen && inviteLink ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lifexp-invite-qr-title"
          onClick={() => setQrOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <p id="lifexp-invite-qr-title" className="text-center text-base font-bold text-slate-900 dark:text-slate-100">
              QR-Code zum Beitritt
            </p>
            <p className="mt-1 text-center text-sm text-slate-950 dark:text-slate-400">
              Mit dem Handy des Familienmitglieds scannen — Beitritt startet automatisch.
            </p>
            <div className="mt-4 flex justify-center">
              <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-600/80">
                <QRCodeSVG
                  value={inviteLink}
                  size={280}
                  level="M"
                  marginSize={2}
                  role="img"
                  aria-label="QR-Code zum Einladungslink"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setQrOpen(false)}
              className={`${PRESSABLE_3D_CLASS} mt-5 w-full rounded-xl border-2 border-slate-400 bg-gradient-to-b from-slate-100 to-slate-200/90 px-4 py-2.5 text-sm font-bold text-slate-950 dark:border-slate-600 dark:from-slate-800 dark:to-slate-950 dark:text-slate-100`}
            >
              Schließen
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
