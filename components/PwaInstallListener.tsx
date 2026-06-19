'use client'

import { useEffect } from 'react'

import { attachPwaInstallListener, syncAppInstalledProfileIfStandalone } from '../lib/pwaInstall'

/** Hält das Browser-Install-Prompt bereit. */
export default function PwaInstallListener() {
  useEffect(() => {
    attachPwaInstallListener()
    void syncAppInstalledProfileIfStandalone()
  }, [])

  return null
}
