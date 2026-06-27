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

type FamilyInviteSharePanelProps = {
  inviteCode: string
  familyName?: string | null
}

const ACTION_BUTTON_CLASS = `${PRESSABLE_3D_CLASS} rounded-xl border-2 border-slate-400 bg-gradient-to-b from-slate-100 to-slate-200/90 px-3 py-2 text-sm font-bold text-slate-800 dark:border-slate-600 dark:from-slate-800 dark:to-slate-950 dark:text-slate-100`

const COPIED_LINK_HINT = 'Link kopiert — per SMS/WhatsApp versenden'
const COPIED_CODE_HINT = 'Code kopiert — per SMS/WhatsApp versenden'

export default function FamilyInviteSharePanel({ inviteCode, familyName }: FamilyInviteSharePanelProps) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const [showCopiedLink, setShowCopiedLink] = useState(false)
  const [showCopiedCode, setShowCopiedCode] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [nativeShare, setNativeShare] = useState(false)

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

  const handleCopyLink = useCallback(async () => {
    const ok = await copyFamilyInviteLink(inviteCode)
    if (ok) showCopiedLinkFeedback()
    else setFeedback('Kopieren fehlgeschlagen')
  }, [inviteCode, showCopiedLinkFeedback])

  const handleCopyCode = useCallback(async () => {
    const ok = await copyFamilyInviteCode(inviteCode)
    if (ok) showCopiedCodeFeedback()
    else setFeedback('Kopieren fehlgeschlagen')
  }, [inviteCode, showCopiedCodeFeedback])

  const handleShare = useCallback(async () => {
    const result = await shareFamilyInviteLink({ inviteCode, familyName })
    if (result === 'shared') setFeedback('Teilen-Menü geöffnet')
    else if (result === 'failed') setFeedback('Teilen fehlgeschlagen')
  }, [inviteCode, familyName])

  const code = inviteCode.trim()
  if (!code) return null

  return (
    <div className="space-y-3 border-t border-slate-300/70 pt-2 dark:border-slate-600/70">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Einladungscode</p>
        <p className="font-mono text-sm font-semibold text-slate-950 dark:text-slate-100">{code}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void handleCopyLink()} className={ACTION_BUTTON_CLASS}>
          Einladungslink kopieren
        </button>
        <button
          type="button"
          onClick={() => void (nativeShare ? handleShare() : handleCopyCode())}
          className={ACTION_BUTTON_CLASS}
        >
          {nativeShare ? 'Teilen …' : 'Code kopieren'}
        </button>
      </div>

      {feedback ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300" role="status">
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

      {inviteLink ? (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-slate-200/90 bg-white/80 p-3 dark:border-slate-700/80 dark:bg-slate-900/50">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">QR-Code</p>
          <div className="rounded-lg bg-white p-2 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-600/80">
            <QRCodeSVG
              value={inviteLink}
              size={148}
              level="M"
              marginSize={1}
              role="img"
              aria-label="QR-Code zum Einladungslink"
            />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Mit dem Handy des Familienmitglieds scannen — Beitritt startet automatisch.
          </p>
        </div>
      ) : null}
    </div>
  )
}
