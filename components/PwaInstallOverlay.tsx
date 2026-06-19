'use client'

import { useCallback, useEffect, useState } from 'react'

import PwaInstallPanel from './PwaInstallPanel'
import { LIFEXP_PROFILE_SETTINGS_CHANGED_EVENT } from '../lib/profile'
import {
  hasPwaInstallLater,
  isStandaloneDisplayMode,
  recordPwaInstallLaterChoice,
  shouldOfferPwaInstall,
  syncPwaInstallLaterFromProfile,
} from '../lib/pwaInstall'
import { getActiveUsername, LIFEXP_ACTIVE_USER_CHANGED_EVENT } from '../lib/user'

export default function PwaInstallOverlay() {
  const [open, setOpen] = useState(false)

  const syncVisibility = useCallback(async () => {
    if (!getActiveUsername() || isStandaloneDisplayMode()) {
      setOpen(false)
      return
    }
    await syncPwaInstallLaterFromProfile()
    setOpen(shouldOfferPwaInstall())
  }, [])

  useEffect(() => {
    void syncVisibility()
    const onChange = () => void syncVisibility()
    window.addEventListener(LIFEXP_ACTIVE_USER_CHANGED_EVENT, onChange)
    window.addEventListener('storage', onChange)
    window.addEventListener(LIFEXP_PROFILE_SETTINGS_CHANGED_EVENT, onChange)
    return () => {
      window.removeEventListener(LIFEXP_ACTIVE_USER_CHANGED_EVENT, onChange)
      window.removeEventListener('storage', onChange)
      window.removeEventListener(LIFEXP_PROFILE_SETTINGS_CHANGED_EVENT, onChange)
    }
  }, [syncVisibility])

  const handleLater = () => {
    void recordPwaInstallLaterChoice({ persistToProfile: true }).then(() => {
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
      <div className="w-full max-w-md rounded-2xl border-2 border-slate-300/90 bg-gradient-to-b from-white via-white to-slate-50/95 p-5 shadow-[0_16px_48px_-12px_rgba(15,23,42,0.35)] dark:border-slate-600 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950/95">
        <h2
          id="pwa-install-title"
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
        >
          LifeXP zum Home-Bildschirm
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          So startest du LifeXP wie eine App — ohne Browser-Leiste.
        </p>
        <div className="mt-4">
          <PwaInstallPanel showLaterButton onLater={handleLater} onInstalled={handleInstalled} />
        </div>
      </div>
    </div>
  )
}
