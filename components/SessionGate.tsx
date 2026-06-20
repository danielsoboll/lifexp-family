'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useFamily } from './FamilyProvider'
import { HOME_PATH, isPublicLegalPath } from '../lib/legalRoutes'
import { runProductionDomainFreshStartIfNeeded } from '../lib/productionDomainFreshStart'
import { MAIN_SHELL_CLASS } from '../lib/appShell'

export default function SessionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { hasSession, loading: familyLoading } = useFamily()
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

    if (familyLoading) {
      return
    }

    if (!hasSession && pathname !== HOME_PATH) {
      router.replace(HOME_PATH)
      return
    }

    if (!cancelled) setReady(true)

    return () => {
      cancelled = true
    }
  }, [pathname, router, familyLoading, hasSession])

  if (!ready || (familyLoading && !isPublicLegalPath(pathname))) {
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
