'use client'

import { useEffect } from 'react'

import { applyAppIcons, resolveAppIconGender } from '../lib/appIcon'
import { loadOnboardingDraft } from '../lib/onboardingDraft'
import { fetchCurrentProfile, LIFEXP_PROFILE_SETTINGS_CHANGED_EVENT } from '../lib/profile'
import { getActiveUsername, LIFEXP_ACTIVE_USER_CHANGED_EVENT } from '../lib/user'

async function resolveIconGenderForSync(): Promise<ReturnType<typeof resolveAppIconGender>> {
  const draft = loadOnboardingDraft()
  if (draft?.incomplete && draft.avatarGender) {
    return draft.avatarGender
  }

  if (getActiveUsername()) {
    const { settings, error } = await fetchCurrentProfile()
    if (!error && settings.avatarGender) {
      return settings.avatarGender
    }
  }

  return resolveAppIconGender()
}

/** Homescreen-Icon / Manifest passend zum Anzeige-Avatar (männlich/weiblich). */
export default function PwaIconSync() {
  useEffect(() => {
    let cancelled = false

    const sync = async () => {
      const gender = await resolveIconGenderForSync()
      if (cancelled) return
      applyAppIcons(gender)
    }

    const onSync = () => {
      void sync()
    }

    void sync()
    window.addEventListener(LIFEXP_ACTIVE_USER_CHANGED_EVENT, onSync)
    window.addEventListener(LIFEXP_PROFILE_SETTINGS_CHANGED_EVENT, onSync)
    return () => {
      cancelled = true
      window.removeEventListener(LIFEXP_ACTIVE_USER_CHANGED_EVENT, onSync)
      window.removeEventListener(LIFEXP_PROFILE_SETTINGS_CHANGED_EVENT, onSync)
    }
  }, [])

  return null
}
