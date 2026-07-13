'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useFamily } from './FamilyProvider'
import PwaInstallTopBanner from './PwaInstallTopBanner'
import {
  isBillingReturnPath,
  notifyFamilySessionRestoredIfNeeded,
  recoverFamilySessionAfterBillingRedirect,
} from '../lib/family/billingReturn'
import { bootstrapPwaClientStorage } from '../lib/pwaClientStorage'
import { HOME_PATH, isPublicLegalPath } from '../lib/legalRoutes'
import { hasFamilySession } from '../lib/familySession'
import { reportAppError, STUCK_LOADING_MS } from '../lib/errorNotbremse'
import { runProductionDomainFreshStartIfNeeded } from '../lib/productionDomainFreshStart'
import { MAIN_SHELL_CLASS } from '../lib/appShell'

export default function SessionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { hasSession, loading: familyLoading } = useFamily()
  const [hydrated, setHydrated] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [loadingTimedOut, setLoadingTimedOut] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!familyLoading) {
      setLoadingTimedOut(false)
    }
  }, [familyLoading])

  useEffect(() => {
    const waitingForFamily =
      familyLoading &&
      (hasSession || hasFamilySession() || isBillingReturnPath(pathname)) &&
      !isPublicLegalPath(pathname)

    if (!waitingForFamily || loadingTimedOut) return

    const timer = window.setTimeout(() => {
      setLoadingTimedOut(true)
      reportAppError('Laden dauert ungewöhnlich lange.', 'loading-timeout')
    }, STUCK_LOADING_MS)

    return () => window.clearTimeout(timer)
  }, [familyLoading, hasSession, pathname, loadingTimedOut])

  useEffect(() => {
    if (!hydrated) return

    runProductionDomainFreshStartIfNeeded()
    bootstrapPwaClientStorage()

    const storedSession = isBillingReturnPath(pathname)
      ? recoverFamilySessionAfterBillingRedirect()
      : null
    if (storedSession) {
      notifyFamilySessionRestoredIfNeeded(storedSession, hasSession)
    }

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
    !loadingTimedOut &&
    (redirecting ||
      (familyLoading &&
        (hasSession || hasFamilySession() || isBillingReturnPath(pathname)) &&
        !isPublicLegalPath(pathname)))

  if (showLoader) {
    return (
      <main
        className={`${MAIN_SHELL_CLASS} flex min-h-dvh items-center justify-center text-sm text-slate-950 dark:text-slate-400`}
      >
        <p>Wird geladen …</p>
      </main>
    )
  }

  return (
    <>
      <PwaInstallTopBanner />
      {children}
    </>
  )
}
