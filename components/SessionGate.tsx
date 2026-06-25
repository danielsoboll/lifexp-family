'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useFamily } from './FamilyProvider'
import {
  bootstrapFamilySessionAfterExternalRedirect,
  isBillingReturnPath,
  notifyFamilySessionRestoredIfNeeded,
} from '../lib/family/billingReturn'
import { HOME_PATH, isPublicLegalPath } from '../lib/legalRoutes'
import { hasFamilySession } from '../lib/familySession'
import { runProductionDomainFreshStartIfNeeded } from '../lib/productionDomainFreshStart'
import { MAIN_SHELL_CLASS } from '../lib/appShell'

export default function SessionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { hasSession, loading: familyLoading } = useFamily()
  const [hydrated, setHydrated] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return

    runProductionDomainFreshStartIfNeeded()
    const storedSession = bootstrapFamilySessionAfterExternalRedirect()
    notifyFamilySessionRestoredIfNeeded(storedSession, hasSession)

    if (isPublicLegalPath(pathname)) {
      setRedirecting(false)
      return
    }

    if (isBillingReturnPath(pathname)) {
      if (familyLoading && (hasSession || storedSession || hasFamilySession())) {
        return
      }
      setRedirecting(false)
      return
    }

    if (familyLoading) return

    const sessionKnown = hasSession || hasFamilySession()
    if (!sessionKnown && pathname !== HOME_PATH) {
      setRedirecting(true)
      router.replace(HOME_PATH)
      return
    }

    setRedirecting(false)
  }, [hydrated, pathname, router, familyLoading, hasSession])

  if (!hydrated) {
    return <>{children}</>
  }

  const showLoader =
    redirecting ||
    (familyLoading && (hasSession || hasFamilySession() || isBillingReturnPath(pathname)) && !isPublicLegalPath(pathname))

  if (showLoader) {
    return (
      <main
        className={`${MAIN_SHELL_CLASS} flex min-h-dvh items-center justify-center text-sm text-slate-950 dark:text-slate-400`}
      >
        <p>Wird geladen …</p>
      </main>
    )
  }

  return <>{children}</>
}
