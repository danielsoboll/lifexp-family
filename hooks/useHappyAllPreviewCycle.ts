'use client'

import { useEffect, useState, type RefObject } from 'react'

import {
  HAPPY_ALL_PREVIEW_CYCLE_MS,
  ONBOARDING_PREVIEW_SCROLL_MS,
} from '../lib/family/onboardingPreviewFamily'
import { slowScrollContainerToTop } from '../lib/slowScroll'

/** Onboarding-Vorschau: nach Intervall erst hochscrollen, dann Set 1 ↔ 2 wechseln. */
export function useHappyAllPreviewCycle(
  active: boolean,
  scrollContainerRef?: RefObject<HTMLElement | null>,
): boolean {
  const [showAlternate, setShowAlternate] = useState(false)

  useEffect(() => {
    if (!active) {
      setShowAlternate(false)
      return
    }

    let cancelled = false
    let waitTimer: number | undefined

    const scheduleNextCycle = () => {
      waitTimer = window.setTimeout(async () => {
        if (cancelled) return

        await slowScrollContainerToTop(scrollContainerRef?.current, {
          durationMs: ONBOARDING_PREVIEW_SCROLL_MS,
        })
        if (cancelled) return

        setShowAlternate((current) => !current)
        scheduleNextCycle()
      }, HAPPY_ALL_PREVIEW_CYCLE_MS)
    }

    scheduleNextCycle()

    return () => {
      cancelled = true
      if (waitTimer !== undefined) window.clearTimeout(waitTimer)
    }
  }, [active, scrollContainerRef])

  return showAlternate
}
