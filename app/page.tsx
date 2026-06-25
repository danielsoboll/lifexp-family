'use client'

import { useEffect, useState } from 'react'

import FamilyDashboard from '../components/FamilyDashboard'
import WelcomeStartScreen from '../components/WelcomeStartScreen'
import { useFamily } from '../components/FamilyProvider'
import { bootstrapOnboardingBridge } from '../lib/family/onboardingBridge'
import { hasFamilySession } from '../lib/familySession'
import { bootstrapPwaClientStorage } from '../lib/pwaClientStorage'
import { MAIN_SHELL_CLASS } from '../lib/appShell'

export default function HomePage() {
  const { hasSession, loading } = useFamily()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    bootstrapPwaClientStorage()
    bootstrapOnboardingBridge()
    setMounted(true)

    const onResume = () => {
      if (document.visibilityState === 'hidden') return
      bootstrapPwaClientStorage()
      bootstrapOnboardingBridge()
    }

    window.addEventListener('pageshow', onResume)
    document.addEventListener('visibilitychange', onResume)
    return () => {
      window.removeEventListener('pageshow', onResume)
      document.removeEventListener('visibilitychange', onResume)
    }
  }, [])

  if (!mounted) {
    return (
      <main
        className={`${MAIN_SHELL_CLASS} flex min-h-dvh items-center justify-center text-sm text-slate-950 dark:text-slate-400`}
      >
        <p>Wird geladen …</p>
      </main>
    )
  }

  const sessionPresent = hasSession || hasFamilySession()

  if (loading && sessionPresent) {
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
