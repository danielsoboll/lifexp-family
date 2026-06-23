'use client'

import { useEffect, useRef, type RefObject } from 'react'

import { ONBOARDING_PROMO_IDLE_MS } from '../lib/family/onboardingPromoBanner'

type UseOnboardingPromoIdleCycleOptions = {
  enabled: boolean
  promoVisible: boolean
  onShow: () => void
  activityRootRef?: RefObject<HTMLElement | null>
}

/** Nach Inaktivität Banner zeigen — nach Schließen erneut starten. */
export function useOnboardingPromoIdleCycle({
  enabled,
  promoVisible,
  onShow,
  activityRootRef,
}: UseOnboardingPromoIdleCycleOptions): void {
  const onShowRef = useRef(onShow)
  onShowRef.current = onShow

  const idleTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const clearIdleTimer = () => {
      if (idleTimerRef.current !== undefined) {
        window.clearTimeout(idleTimerRef.current)
        idleTimerRef.current = undefined
      }
    }

    const scheduleIdleShow = () => {
      clearIdleTimer()
      if (!enabled || promoVisible) return
      idleTimerRef.current = window.setTimeout(() => {
        idleTimerRef.current = undefined
        onShowRef.current()
      }, ONBOARDING_PROMO_IDLE_MS)
    }

    if (!enabled || promoVisible) {
      clearIdleTimer()
      return clearIdleTimer
    }

    scheduleIdleShow()

    const root = activityRootRef?.current
    if (!root) return clearIdleTimer

    const markActivity = () => scheduleIdleShow()
    const events = ['pointerdown', 'keydown', 'touchstart'] as const

    for (const event of events) {
      root.addEventListener(event, markActivity, { passive: true, capture: true })
    }

    return () => {
      for (const event of events) {
        root.removeEventListener(event, markActivity, { capture: true })
      }
      clearIdleTimer()
    }
  }, [activityRootRef, enabled, promoVisible])
}
