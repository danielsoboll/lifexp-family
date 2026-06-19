'use client'

import { useEffect } from 'react'

import { attachPwaInstallListener, syncAppInstalledProfileIfStandalone, syncPwaInstallLaterFromProfile } from '../lib/pwaInstall'
import { getActiveUsername, LIFEXP_ACTIVE_USER_CHANGED_EVENT } from '../lib/user'

/** Hält das Browser-Install-Prompt bereit und synchronisiert `app_installed` im Standalone-Modus. */
export default function PwaInstallListener() {
  useEffect(() => {
    attachPwaInstallListener()

    const sync = () => {
      if (getActiveUsername()) {
        void syncAppInstalledProfileIfStandalone()
        void syncPwaInstallLaterFromProfile()
      }
    }

    sync()
    window.addEventListener(LIFEXP_ACTIVE_USER_CHANGED_EVENT, sync)
    return () => window.removeEventListener(LIFEXP_ACTIVE_USER_CHANGED_EVENT, sync)
  }, [])

  return null
}
