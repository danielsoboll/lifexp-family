'use client'

import { useEffect } from 'react'

import {
  attachPwaInstallListener,
  syncAppInstalledFromDisplayMode,
  syncPwaInstallLaterFromProfile,
} from '../lib/pwaInstall'

/** Hält das Browser-Install-Prompt bereit und synchronisiert den Home-Bildschirm-Status. */
export default function PwaInstallListener() {
  useEffect(() => {
    attachPwaInstallListener()
    void syncAppInstalledFromDisplayMode()
    void syncPwaInstallLaterFromProfile()

    const onStart = () => void syncAppInstalledFromDisplayMode()
    window.addEventListener('pageshow', onStart)
    return () => window.removeEventListener('pageshow', onStart)
  }, [])

  return null
}
