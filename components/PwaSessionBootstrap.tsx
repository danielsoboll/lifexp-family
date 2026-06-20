'use client'

import { useEffect } from 'react'

import { applyAppIcons } from '../lib/appIcon'
import {
  bootstrapClientStorageFromCookies,
  mirrorBridgedStorageToCookies,
} from '../lib/clientStorageBootstrap'
import { attachOnboardingBridgeFlushListeners } from '../lib/family/onboardingBridge'
import { clearFamilyOnboardingDraft } from '../lib/family/onboardingDraft'
import { runProductionDomainFreshStartIfNeeded } from '../lib/productionDomainFreshStart'
import { applyDarkClass, getStoredTheme, resolveInitialDark } from '../lib/theme'
import { FAMILY_SESSION_CHANGED_EVENT, hasFamilySession } from '../lib/familySession'

/** Theme, Session, Draft: Safari ↔ Home-Bildschirm angleichen. */
export default function PwaSessionBootstrap() {
  useEffect(() => {
    runProductionDomainFreshStartIfNeeded()
    bootstrapClientStorageFromCookies()
    mirrorBridgedStorageToCookies()

    if (hasFamilySession()) {
      clearFamilyOnboardingDraft()
    }

    const theme = getStoredTheme()
    applyDarkClass(theme ? theme === 'dark' : resolveInitialDark())
    applyAppIcons()

    const detachFlush = attachOnboardingBridgeFlushListeners()

    const onResume = () => {
      if (document.visibilityState === 'hidden') return

      const hadSession = hasFamilySession()
      runProductionDomainFreshStartIfNeeded()
      bootstrapClientStorageFromCookies()
      mirrorBridgedStorageToCookies()

      if (hasFamilySession()) {
        clearFamilyOnboardingDraft()
      }

      applyAppIcons()

      if (!hadSession && hasFamilySession()) {
        window.dispatchEvent(new Event(FAMILY_SESSION_CHANGED_EVENT))
      }
    }

    window.addEventListener('pageshow', onResume)
    document.addEventListener('visibilitychange', onResume)
    return () => {
      detachFlush()
      window.removeEventListener('pageshow', onResume)
      document.removeEventListener('visibilitychange', onResume)
    }
  }, [])

  return null
}
