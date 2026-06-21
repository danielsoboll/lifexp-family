'use client'

import { useCallback, useEffect, useRef } from 'react'

import {
  attachOnboardingBridgeFlushListeners,
  attachOnboardingResumeListeners,
  bootstrapOnboardingBridge,
  flushOnboardingBridge,
} from '../lib/family/onboardingBridge'

/** Safari ↔ Home-Bildschirm: Draft/Session vor Verlassen flushen, beim Zurückkommen neu laden. */
export function useFamilyOnboardingBridge(options?: { onResume?: () => void }) {
  const onResumeRef = useRef(options?.onResume)
  onResumeRef.current = options?.onResume

  const handleResume = useCallback(() => {
    onResumeRef.current?.()
  }, [])

  useEffect(() => {
    bootstrapOnboardingBridge()
    queueMicrotask(() => flushOnboardingBridge())

    const detachFlush = attachOnboardingBridgeFlushListeners()
    const detachResume = attachOnboardingResumeListeners(handleResume)

    return () => {
      detachFlush()
      detachResume()
    }
  }, [handleResume])
}
