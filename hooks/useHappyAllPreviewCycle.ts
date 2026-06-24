'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

import {
  ONBOARDING_PREVIEW_FAMILY_SET_1_MS,
  ONBOARDING_PREVIEW_FAMILY_SET_2_MS,
  ONBOARDING_PREVIEW_END_PAUSE_MS,
  ONBOARDING_PREVIEW_FAMILY_1_FRITZ_HOLD_MS,
  ONBOARDING_PREVIEW_FAMILY_1_FRITZ_SCROLL_MS,
  ONBOARDING_PREVIEW_FRITZ_SELECTOR,
  ONBOARDING_PREVIEW_SCROLL_MS,
} from '../lib/family/onboardingPreviewFamily'
import { slowScrollContainerToRevealElement, slowScrollContainerToTop } from '../lib/slowScroll'

/** Onboarding-Vorschau: Set 1 (10 s) ↔ Set 2 (10 s), dazwischen hochscrollen. */
export function useHappyAllPreviewCycle(
  active: boolean,
  scrollContainerRef?: RefObject<HTMLElement | null>,
): boolean {
  const [showAlternate, setShowAlternate] = useState(false)
  const showAlternateRef = useRef(false)

  useEffect(() => {
    if (!active) {
      showAlternateRef.current = false
      setShowAlternate(false)
      return
    }

    let cancelled = false
    let waitTimer: number | undefined

    const scheduleNextCycle = () => {
      const durationMs = showAlternateRef.current
        ? ONBOARDING_PREVIEW_FAMILY_SET_2_MS
        : ONBOARDING_PREVIEW_FAMILY_SET_1_MS

      waitTimer = window.setTimeout(async () => {
        if (cancelled) return

        const container = scrollContainerRef?.current
        const leavingFamily1 = !showAlternateRef.current

        if (leavingFamily1 && container) {
          const fritzEl = container.querySelector(ONBOARDING_PREVIEW_FRITZ_SELECTOR)
          if (fritzEl instanceof HTMLElement) {
            await slowScrollContainerToRevealElement(container, fritzEl, {
              topInsetPx: 12,
              bottomInsetPx: 24,
              durationMs: ONBOARDING_PREVIEW_FAMILY_1_FRITZ_SCROLL_MS,
            })
            if (cancelled) return
            await new Promise<void>((resolve) => {
              window.setTimeout(resolve, ONBOARDING_PREVIEW_FAMILY_1_FRITZ_HOLD_MS)
            })
            if (cancelled) return
          }
        }

        await slowScrollContainerToTop(container, {
          durationMs: ONBOARDING_PREVIEW_SCROLL_MS,
        })
        if (cancelled) return

        setShowAlternate((current) => {
          const next = !current
          showAlternateRef.current = next
          return next
        })
        scheduleNextCycle()
      }, durationMs + ONBOARDING_PREVIEW_END_PAUSE_MS)
    }

    showAlternateRef.current = false
    setShowAlternate(false)
    scheduleNextCycle()

    return () => {
      cancelled = true
      if (waitTimer !== undefined) window.clearTimeout(waitTimer)
    }
  }, [active, scrollContainerRef])

  return showAlternate
}
