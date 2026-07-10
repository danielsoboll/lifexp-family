'use client'

import { useState } from 'react'

import PwaInstallPanel from './PwaInstallPanel'
import { notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import { updateMemberAppInstalled } from '../lib/family/memberSettings'
import {
  recordPwaInstallLaterChoice,
  shouldShowPwaInstallPromo,
} from '../lib/pwaInstall'
import { CARD_SURFACE_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

type PwaInstallPromoCardProps = {
  /** Kompakter Teaser mit Aufklappen — Dashboard. */
  collapsible?: boolean
  className?: string
}

export default function PwaInstallPromoCard({ collapsible = false, className = '' }: PwaInstallPromoCardProps) {
  const { parent, activeChild, memberKind, session, refresh } = useFamily()
  const member = parent ?? activeChild
  const [expanded, setExpanded] = useState(!collapsible)
  const [installSaving, setInstallSaving] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || !member || !session) return null
  if (!shouldShowPwaInstallPromo(member.app_installed)) return null

  const handleInstallDone = async () => {
    setInstallSaving(true)
    const { error } = await updateMemberAppInstalled(session.memberKind, session.memberId, true)
    setInstallSaving(false)
    if (error) return
    notifyFamilyDataChanged()
    await refresh()
    setDismissed(true)
  }

  const handleLater = () => {
    void recordPwaInstallLaterChoice().then(() => {
      setDismissed(true)
    })
  }

  if (collapsible && !expanded) {
    return (
      <section
        className={`rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-50 via-white to-amber-50/80 p-4 shadow-[0_8px_24px_-12px_rgba(5,150,105,0.45)] dark:border-emerald-600/50 dark:from-emerald-950/50 dark:via-slate-900 dark:to-slate-900 ${className}`}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
          Empfohlen
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
          LifeXP Family zum Home-Bildschirm
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-950 dark:text-slate-300">
          Starte die App wie eine installierte App — ohne Browser-Leiste, mit einem Tipp vom Startbildschirm.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={`${PRESSABLE_3D_CLASS} flex-1 rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-bold text-white`}
          >
            Jetzt hinzufügen
          </button>
          <button
            type="button"
            onClick={handleLater}
            className={`${PRESSABLE_3D_CLASS} rounded-2xl border-2 border-stone-400 bg-gradient-to-b from-stone-100 to-stone-300/90 px-4 py-3 text-sm font-bold text-stone-800 dark:border-stone-600 dark:from-stone-700 dark:to-stone-900 dark:text-stone-100`}
          >
            Später
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className={`${CARD_SURFACE_CLASS} space-y-3 rounded-2xl border-2 border-emerald-500/35 p-4 ${className}`}>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
          Empfohlen
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
          LifeXP Family zum Home-Bildschirm
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-950 dark:text-slate-400">
          So startest du LifeXP Family mit einem Tipp — wie eine richtige App.
        </p>
      </div>

      <PwaInstallPanel
        prominent
        showIosDoneButton
        iosInstallConfirmed={member.app_installed}
        iosDoneSaving={installSaving}
        onIosDone={() => void handleInstallDone()}
        onInstalled={() => void handleInstallDone()}
      />

      <button
        type="button"
        onClick={handleLater}
        className="w-full text-center text-sm font-semibold text-slate-950 underline underline-offset-2 dark:text-slate-300"
      >
        Vielleicht später
      </button>
    </section>
  )
}
