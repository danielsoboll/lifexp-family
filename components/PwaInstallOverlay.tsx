'use client'

import { useCallback, useEffect, useState } from 'react'

import PwaInstallPanel from './PwaInstallPanel'
import { useFamily } from './FamilyProvider'
import {
  hasPwaInstallLater,
  isStandaloneDisplayMode,
  recordPwaInstallLaterChoice,
  shouldOfferPwaInstall,
} from '../lib/pwaInstall'

export default function PwaInstallOverlay() {
  const { parent, activeChild } = useFamily()
  const member = parent ?? activeChild
  const appInstalled = member?.app_installed === true
  const [open, setOpen] = useState(false)

  const syncVisibility = useCallback(async () => {
    if (isStandaloneDisplayMode()) {
      setOpen(false)
      return
    }
    setOpen(shouldOfferPwaInstall(appInstalled))
  }, [appInstalled])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Overlay-Sichtbarkeit aus PWA-Status
    void syncVisibility()
    const onChange = () => void syncVisibility()
    window.addEventListener('storage', onChange)
    window.addEventListener('lifexp-family-data-changed', onChange)
    return () => {
      window.removeEventListener('storage', onChange)
      window.removeEventListener('lifexp-family-data-changed', onChange)
    }
  }, [syncVisibility])

  const handleLater = () => {
    void recordPwaInstallLaterChoice().then(() => {
      setOpen(false)
    })
  }

  const handleInstalled = () => {
    setOpen(false)
  }

  if (!open || isStandaloneDisplayMode() || hasPwaInstallLater()) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
    >
      <div className="w-full max-w-md rounded-2xl border-2 border-emerald-500/35 bg-gradient-to-b from-white via-white to-emerald-50/40 p-5 shadow-[0_16px_48px_-12px_rgba(15,23,42,0.35)] dark:border-emerald-600/40 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
          Empfohlen
        </p>
        <h2
          id="pwa-install-title"
          className="mt-1 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
        >
          LifeXP Family zum Home-Bildschirm
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-950 dark:text-slate-400">
          Starte die App mit einem Tipp — ohne Browser-Leiste, direkt vom Startbildschirm.
        </p>
        <div className="mt-4">
          <PwaInstallPanel prominent showLaterButton onLater={handleLater} onInstalled={handleInstalled} />
        </div>
      </div>
    </div>
  )
}
