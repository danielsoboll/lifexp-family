'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { fetchProfileByUsername } from '../lib/profile'
import { bootstrapClientStorageFromCookies } from '../lib/clientStorageBootstrap'
import { isPublicLegalPath } from '../lib/legalRoutes'
import { clearOnboardingDraft, hasIncompleteOnboardingDraft } from '../lib/onboardingDraft'
import { confirmActiveUserProfile } from '../lib/onboardingSession'
import { runProductionDomainFreshStartIfNeeded } from '../lib/productionDomainFreshStart'
import { MAIN_SHELL_CLASS } from '../lib/appShell'
import { savePrimaryGoal } from '../lib/storage'
import { getActiveUsername, getStoredUsername, shouldPersistLocalProfilePrefs } from '../lib/user'

const ONBOARDING_PATH = '/onboarding'
const HOME_PATH = '/'

export default function SessionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Ladezustand bei Route-/Session-Wechsel
    setReady(false)

    const run = async () => {
      runProductionDomainFreshStartIfNeeded()
      bootstrapClientStorageFromCookies()

      if (isPublicLegalPath(pathname)) {
        if (!cancelled) setReady(true)
        return
      }

      const onHome = pathname === HOME_PATH
      const onOnboarding = pathname === ONBOARDING_PATH

      if (hasIncompleteOnboardingDraft()) {
        const outcome = await confirmActiveUserProfile()
        if (outcome === 'user') {
          clearOnboardingDraft()
        } else {
          if (!onHome) {
            router.replace(HOME_PATH)
            return
          }
          if (!cancelled) setReady(true)
          return
        }
      }

      const username = getActiveUsername() ?? getStoredUsername()

      if (!username) {
        if (onOnboarding) {
          router.replace(HOME_PATH)
          return
        }
        if (!onHome) {
          router.replace(HOME_PATH)
          return
        }
        if (!cancelled) {
          setReady(true)
        }
        return
      }

      if (onOnboarding) {
        router.replace(HOME_PATH)
        return
      }

      const outcome = await confirmActiveUserProfile()
      if (cancelled) return

      if (outcome === 'user') {
        if (hasIncompleteOnboardingDraft()) {
          clearOnboardingDraft()
        }
        if (shouldPersistLocalProfilePrefs()) {
          const { settings } = await fetchProfileByUsername(username)
          savePrimaryGoal(settings.goalType)
        }
      } else if (outcome === 'guest') {
        if (!onHome) {
          router.replace(HOME_PATH)
          return
        }
      } else if (!onHome) {
        router.replace(HOME_PATH)
        return
      }

      setReady(true)
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [pathname, router])

  if (!ready) {
    return (
      <main
        className={`${MAIN_SHELL_CLASS} flex min-h-dvh items-center justify-center text-sm text-slate-600 dark:text-slate-400`}
      >
        <p>Wird geladen …</p>
      </main>
    )
  }

  return <>{children}</>
}
