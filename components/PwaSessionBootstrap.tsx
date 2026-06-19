'use client'

import { useEffect } from 'react'

import { applyAppIcons, resolveAppIconGender } from '../lib/appIcon'
import { runProductionDomainFreshStartIfNeeded } from '../lib/productionDomainFreshStart'
import { applyDarkClass, getStoredTheme, resolveInitialDark } from '../lib/theme'

/** Theme + PWA-Icons beim Start synchronisieren. */
export default function PwaSessionBootstrap() {
  useEffect(() => {
    runProductionDomainFreshStartIfNeeded()

    const theme = getStoredTheme()
    applyDarkClass(theme ? theme === 'dark' : resolveInitialDark())
    applyAppIcons(resolveAppIconGender())

    const onResume = () => {
      runProductionDomainFreshStartIfNeeded()
      applyAppIcons(resolveAppIconGender())
    }

    document.addEventListener('visibilitychange', onResume)
    window.addEventListener('pageshow', onResume)
    window.addEventListener('focus', onResume)
    return () => {
      document.removeEventListener('visibilitychange', onResume)
      window.removeEventListener('pageshow', onResume)
      window.removeEventListener('focus', onResume)
    }
  }, [])

  return null
}
