'use client'

import { useEffect, useState } from 'react'

import FamilyDashboard from '../components/FamilyDashboard'
import WelcomeStartScreen from '../components/WelcomeStartScreen'
import { useFamily } from '../components/FamilyProvider'
import { bootstrapFamilySessionAfterExternalRedirect } from '../lib/family/billingReturn'
import { bootstrapOnboardingBridge } from '../lib/family/onboardingBridge'
import { hasFamilySession } from '../lib/familySession'
import { MAIN_SHELL_CLASS } from '../lib/appShell'

export default function HomePage() {
  const { hasSession, loading } = useFamily()
  const [storageChecked, setStorageChecked] = useState(false)

  useEffect(() => {
    bootstrapFamilySessionAfterExternalRedirect()
    bootstrapOnboardingBridge()

    const onResume = () => {
      if (document.visibilityState === 'hidden') return
      bootstrapFamilySessionAfterExternalRedirect()
      bootstrapOnboardingBridge()
    }

    window.addEventListener('pageshow', onResume)
    document.addEventListener('visibilitychange', onResume)
    setStorageChecked(true)
    return () => {
      window.removeEventListener('pageshow', onResume)
      document.removeEventListener('visibilitychange', onResume)
    }
  }, [])

  const sessionPresent = hasSession || hasFamilySession()

  if (!storageChecked || (loading && sessionPresent)) {
    return (
      <main
        className={`${MAIN_SHELL_CLASS} flex min-h-dvh items-center justify-center text-sm text-slate-950 dark:text-slate-400`}
      >
        <p>Wird geladen …</p>
      </main>
    )
  }

  if (sessionPresent) {
    return <FamilyDashboard />
  }

  return <WelcomeStartScreen />
}
