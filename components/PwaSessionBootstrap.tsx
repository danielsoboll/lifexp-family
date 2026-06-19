'use client'

import { useEffect } from 'react'

import {
  bootstrapClientStorageFromCookies,
  mirrorBridgedStorageToCookies,
} from '../lib/clientStorageBootstrap'
import { reconcileIncompleteOnboardingDraft } from '../lib/onboardingSession'
import { runProductionDomainFreshStartIfNeeded } from '../lib/productionDomainFreshStart'
import { applyDarkClass, getStoredTheme, resolveInitialDark } from '../lib/theme'
import { LIFEXP_ACTIVE_USER_CHANGED_EVENT } from '../lib/user'

/**
 * Safari ↔ Home-Screen: Cookies/localStorage angleichen und Session nach Profil wiederherstellen.
 */
export default function PwaSessionBootstrap() {
  useEffect(() => {
    runProductionDomainFreshStartIfNeeded()
    bootstrapClientStorageFromCookies()
    mirrorBridgedStorageToCookies()

    const theme = getStoredTheme()
    applyDarkClass(theme ? theme === 'dark' : resolveInitialDark())

    const reconcile = async () => {
      await reconcileIncompleteOnboardingDraft()
      window.dispatchEvent(new Event(LIFEXP_ACTIVE_USER_CHANGED_EVENT))
    }

    void reconcile()

    const onVisible = () => {
      runProductionDomainFreshStartIfNeeded()
      bootstrapClientStorageFromCookies()
      mirrorBridgedStorageToCookies()
      void reconcile()
    }

    const onResume = () => {
      runProductionDomainFreshStartIfNeeded()
      bootstrapClientStorageFromCookies()
      mirrorBridgedStorageToCookies()
      void reconcile()
      window.dispatchEvent(new Event(LIFEXP_ACTIVE_USER_CHANGED_EVENT))
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onResume)
    window.addEventListener('focus', onResume)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onResume)
      window.removeEventListener('focus', onResume)
    }
  }, [])

  return null
}
