'use client'

import { useEffect } from 'react'

import { useFamily } from './FamilyProvider'
import { reportAppError, STUCK_LOADING_MS } from '../lib/errorNotbremse'

/** Fires Notbremse when family bootstrap loading runs longer than expected. */
export default function AppStuckWatchdog() {
  const { loading, hasSession } = useFamily()

  useEffect(() => {
    if (!loading || !hasSession) return

    const timer = window.setTimeout(() => {
      reportAppError('Laden dauert ungewöhnlich lange.', 'loading-timeout')
    }, STUCK_LOADING_MS)

    return () => window.clearTimeout(timer)
  }, [loading, hasSession])

  return null
}
