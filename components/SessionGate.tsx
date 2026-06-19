'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useAuth } from './AuthProvider'
import { useFamily } from './FamilyProvider'
import {
  FAMILY_SETUP_PATH,
  isFamilySetupPath,
  isPublicAuthPath,
  isPublicLegalPath,
  isPublicPath,
} from '../lib/legalRoutes'
import { runProductionDomainFreshStartIfNeeded } from '../lib/productionDomainFreshStart'
import { MAIN_SHELL_CLASS } from '../lib/appShell'

const HOME_PATH = '/'

export default function SessionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { hasFamily, loading: familyLoading } = useFamily()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Ladezustand bei Route-/Session-Wechsel
    setReady(false)

    runProductionDomainFreshStartIfNeeded()

    if (isPublicLegalPath(pathname)) {
      if (!cancelled) setReady(true)
      return
    }

    if (authLoading || familyLoading) {
      return
    }

    const onSetup = isFamilySetupPath(pathname)
    const onAuthPage = isPublicAuthPath(pathname)
    const onHome = pathname === HOME_PATH

    if (!user) {
      if (!onAuthPage) {
        router.replace('/login')
        return
      }
      if (!cancelled) setReady(true)
      return
    }

    if (!hasFamily) {
      if (!onSetup) {
        router.replace(FAMILY_SETUP_PATH)
        return
      }
      if (!cancelled) setReady(true)
      return
    }

    if (onSetup || onAuthPage) {
      router.replace(HOME_PATH)
      return
    }

    if (!onHome && !isPublicPath(pathname) && pathname.startsWith('/')) {
      if (!cancelled) setReady(true)
      return
    }

    if (!cancelled) setReady(true)

    return () => {
      cancelled = true
    }
  }, [pathname, router, user, authLoading, familyLoading, hasFamily])

  if (!ready || authLoading || (user && familyLoading && !isPublicLegalPath(pathname))) {
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
