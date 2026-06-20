'use client'

import { useEffect } from 'react'

import { attachPwaInstallListener, syncAppInstalledProfileIfStandalone, syncPwaInstallLaterFromProfile } from '../lib/pwaInstall'

/** Hält das Browser-Install-Prompt bereit. */
export default function PwaInstallListener() {
  useEffect(() => {
    attachPwaInstallListener()
    void syncAppInstalledProfileIfStandalone()
    void syncPwaInstallLaterFromProfile()
  }, [])

  return null
}
