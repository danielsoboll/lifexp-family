'use client'

import { useCallback, useEffect, useState } from 'react'

import HomeLive from '../components/HomeLive'
import OnboardingFlow from '../components/OnboardingFlow'
import { MAIN_SHELL_CLASS } from '../lib/appShell'
import { resolveOnboardingSessionMode, type OnboardingSessionMode } from '../lib/onboardingSession'
import { LIFEXP_ACTIVE_USER_CHANGED_EVENT } from '../lib/user'

type SessionMode = 'loading' | OnboardingSessionMode

function HomeLoading() {
  return (
    <main
      className={`${MAIN_SHELL_CLASS} flex min-h-dvh items-center justify-center text-sm text-slate-600 dark:text-slate-400`}
    >
      <p>Wird geladen …</p>
    </main>
  )
}

export default function HomePage() {
  const [mode, setMode] = useState<SessionMode>('loading')

  const syncMode = useCallback(async () => {
    const next = await resolveOnboardingSessionMode()
    setMode(next)
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const next = await resolveOnboardingSessionMode()
      if (!cancelled) setMode(next)
    })()

    const onSessionChange = () => {
      void syncMode()
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void syncMode()
      }
    }

    window.addEventListener(LIFEXP_ACTIVE_USER_CHANGED_EVENT, onSessionChange)
    window.addEventListener('focus', onSessionChange)
    window.addEventListener('pageshow', onSessionChange)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.removeEventListener(LIFEXP_ACTIVE_USER_CHANGED_EVENT, onSessionChange)
      window.removeEventListener('focus', onSessionChange)
      window.removeEventListener('pageshow', onSessionChange)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [syncMode])

  if (mode === 'loading') {
    return <HomeLoading />
  }

  if (mode === 'guest') {
    return <OnboardingFlow onComplete={() => setMode('user')} />
  }

  return <HomeLive />
}
