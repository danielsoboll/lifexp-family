'use client'

import { useCallback, useEffect, useState } from 'react'

import PwaInstallPanel from './PwaInstallPanel'
import { notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import { ONBOARDING_UI_ACTIVE_EVENT } from '../lib/family/onboardingFlow'
import { FAMILY_SESSION_CHANGED_EVENT } from '../lib/familySession'
import { updateMemberAppInstalled } from '../lib/family/memberSettings'
import {
  isStandaloneDisplayMode,
  recordPwaInstallSuccess,
  shouldShowPwaInstallTopBanner,
} from '../lib/pwaInstall'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

export default function PwaInstallTopBanner() {
  const { session, family, hasSession, loading, refresh } = useFamily()
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [onboardingUiActive, setOnboardingUiActive] = useState(false)
  const [installSaving, setInstallSaving] = useState(false)

  const familyReady = hasSession && family !== null && !loading

  const syncVisibility = useCallback(() => {
    if (isStandaloneDisplayMode() || onboardingUiActive) {
      setVisible(false)
      return
    }
    if (dismissed) {
      setVisible(false)
      return
    }
    setVisible(shouldShowPwaInstallTopBanner({ familyReady }))
  }, [dismissed, familyReady, onboardingUiActive])

  useEffect(() => {
    const onOnboardingUi = (event: Event) => {
      const active = (event as CustomEvent<{ active?: boolean }>).detail?.active === true
      setOnboardingUiActive(active)
    }

    const onAppStart = () => {
      if (!familyReady) {
        setDismissed(false)
        setExpanded(false)
      }
      void syncVisibility()
    }

    void syncVisibility()
    const onChange = () => void syncVisibility()
    window.addEventListener('storage', onChange)
    window.addEventListener('lifexp-family-data-changed', onChange)
    window.addEventListener(FAMILY_SESSION_CHANGED_EVENT, onChange)
    window.addEventListener(ONBOARDING_UI_ACTIVE_EVENT, onOnboardingUi)
    window.addEventListener('pageshow', onAppStart)
    return () => {
      window.removeEventListener('storage', onChange)
      window.removeEventListener('lifexp-family-data-changed', onChange)
      window.removeEventListener(FAMILY_SESSION_CHANGED_EVENT, onChange)
      window.removeEventListener(ONBOARDING_UI_ACTIVE_EVENT, onOnboardingUi)
      window.removeEventListener('pageshow', onAppStart)
    }
  }, [syncVisibility, familyReady])

  useEffect(() => {
    void syncVisibility()
  }, [syncVisibility])

  const handleInstallDone = async () => {
    setInstallSaving(true)
    await recordPwaInstallSuccess()
    if (session) {
      await updateMemberAppInstalled(session.memberKind, session.memberId, true)
    }
    setInstallSaving(false)
    notifyFamilyDataChanged()
    await refresh()
    setExpanded(false)
    setVisible(false)
  }

  if (!visible) return null

  if (!expanded) {
    return (
      <div
        className="sticky top-0 z-[30] border-b-2 border-emerald-500/40 bg-gradient-to-r from-emerald-50 via-white to-amber-50/80 px-3 py-2.5 shadow-sm dark:border-emerald-600/40 dark:from-emerald-950/80 dark:via-slate-900 dark:to-slate-900"
        role="region"
        aria-label="App auf den Home-Bildschirm"
      >
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
            App auf den Home-Bildschirm legen — starte LifeXP Family ohne Browser-Leiste.
          </p>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={`${PRESSABLE_3D_CLASS} shrink-0 rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-3 py-2 text-xs font-bold text-white`}
          >
            Hinzufügen
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 underline-offset-2 hover:underline dark:text-slate-400"
            aria-label="Später"
          >
            Später
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="sticky top-0 z-[30] border-b-2 border-emerald-500/40 bg-gradient-to-b from-emerald-50 via-white to-white px-3 py-3 shadow-md dark:border-emerald-600/40 dark:from-emerald-950/80 dark:via-slate-900 dark:to-slate-900"
      role="region"
      aria-label="App auf den Home-Bildschirm"
    >
      <div className="mx-auto max-w-lg space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
              Empfohlen
            </p>
            <h2 className="mt-0.5 text-base font-bold text-slate-900 dark:text-slate-100">
              App auf den Home-Bildschirm
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:underline dark:text-slate-400"
          >
            Schließen
          </button>
        </div>

        <PwaInstallPanel
          prominent
          showIosDoneButton
          iosInstallConfirmed={false}
          iosDoneSaving={installSaving}
          onIosDone={() => void handleInstallDone()}
          onInstalled={() => void handleInstallDone()}
        />

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="w-full text-center text-sm font-semibold text-slate-950 underline underline-offset-2 dark:text-slate-300"
        >
          Vielleicht später
        </button>
      </div>
    </div>
  )
}
