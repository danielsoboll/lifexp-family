'use client'

import { useCallback, useRef, useState } from 'react'

import FamilyInviteSharePanel from './FamilyInviteSharePanel'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'
import { QUICK_CLICK_WAIT_HINT, waitForQuickClickFeedback } from '../lib/quickClickFeedback'

const TEASER_LINE_1 = 'Familienmitglieder verknüpfen'
const TEASER_LINE_2 = 'So macht LifeXP Family Spaß!'
const TEASER_ACTIVE_HINT = 'QR-Code, Link oder Code — unten wählen'

const TEASER_IDLE_CLASS = `${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-amber-500/90 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 px-3.5 py-2.5 text-left shadow-[0_4px_18px_-6px_rgba(245,158,11,0.65)] transition-[transform,box-shadow,filter,border-color,background] duration-300 dark:border-amber-600/80 dark:from-amber-600 dark:via-orange-600 dark:to-amber-700`

const TEASER_ACTIVE_CLASS = `${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-yellow-300/95 bg-gradient-to-b from-yellow-100 via-amber-50 to-yellow-200 px-3.5 py-2.5 text-left shadow-[0_4px_20px_-6px_rgba(250,204,21,0.55),inset_0_1px_0_rgba(255,255,255,0.75)] ring-2 ring-yellow-300/50 transition-[transform,box-shadow,filter,border-color,background] duration-300 dark:border-yellow-500/70 dark:from-yellow-400/25 dark:via-amber-200/20 dark:to-yellow-300/30 dark:ring-yellow-400/35`

type AdminFamilyInviteSectionProps = {
  inviteCode: string
  familyName?: string | null
}

/** Teaser + Einladung — Klick hellt den Teaser auf und goldet die Aktions-Buttons. Kein persistierter Status. */
export default function AdminFamilyInviteSection({ inviteCode, familyName }: AdminFamilyInviteSectionProps) {
  const [inviteFlowActive, setInviteFlowActive] = useState(false)
  const [teaserBusy, setTeaserBusy] = useState(false)
  const activatePromiseRef = useRef<Promise<void> | null>(null)

  const ensureInviteFlowReady = useCallback(async () => {
    if (inviteFlowActive) return
    if (activatePromiseRef.current) {
      await activatePromiseRef.current
      return
    }

    setTeaserBusy(true)
    const promise = (async () => {
      await waitForQuickClickFeedback()
      setInviteFlowActive(true)
      setTeaserBusy(false)
    })()
    activatePromiseRef.current = promise
    try {
      await promise
    } finally {
      activatePromiseRef.current = null
    }
  }, [inviteFlowActive])

  const handleTeaserClick = () => {
    void ensureInviteFlowReady()
  }

  const teaserSubline = teaserBusy
    ? QUICK_CLICK_WAIT_HINT
    : inviteFlowActive
      ? TEASER_ACTIVE_HINT
      : TEASER_LINE_2

  return (
    <>
      <button
        type="button"
        onClick={handleTeaserClick}
        className={`pt-1 ${inviteFlowActive || teaserBusy ? TEASER_ACTIVE_CLASS : TEASER_IDLE_CLASS}`}
        aria-pressed={inviteFlowActive}
        aria-busy={teaserBusy}
        aria-label={`${TEASER_LINE_1}. ${teaserSubline}`}
      >
        <p
          className={`text-balance text-[15px] font-black leading-tight tracking-tight sm:text-base ${
            inviteFlowActive || teaserBusy ? 'text-amber-950 dark:text-yellow-50' : 'text-white'
          }`}
        >
          {TEASER_LINE_1}
        </p>
        <p
          className={`mt-0.5 text-balance text-sm font-bold leading-snug ${
            inviteFlowActive || teaserBusy ? 'text-amber-900/90 dark:text-yellow-100/90' : 'text-amber-50/95'
          }`}
        >
          {teaserSubline}
        </p>
      </button>

      <FamilyInviteSharePanel
        inviteCode={inviteCode}
        familyName={familyName}
        actionsHighlighted={inviteFlowActive || teaserBusy}
        ensureFlowReady={ensureInviteFlowReady}
      />
    </>
  )
}
