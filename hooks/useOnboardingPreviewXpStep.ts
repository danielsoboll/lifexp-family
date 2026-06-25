'use client'

import { useEffect, useState } from 'react'

import { ONBOARDING_PREVIEW_FAMILY_INTRO_MS } from '../lib/family/onboardingPreviewFamily'
import { onboardingPreviewXpStepMs, onboardingPreviewXpTimeline } from '../lib/family/onboardingPreviewXpTimeline'

/** Onboarding-Vorschau: XP-Stufe im Takt der jeweiligen Familie — bei Wechsel Schritt 0. */
export function useOnboardingPreviewXpStep(active: boolean, alternateFamily: boolean): number {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!active) {
      setStep(0)
      return
    }

    setStep(0)
    const stepMs = onboardingPreviewXpStepMs(alternateFamily)
    const maxStep = onboardingPreviewXpTimeline(alternateFamily).length - 1
    const introDelayMs = ONBOARDING_PREVIEW_FAMILY_INTRO_MS

    let interval: number | undefined
    const introTimer = window.setTimeout(() => {
      interval = window.setInterval(() => {
        setStep((current) => Math.min(maxStep, current + 1))
      }, stepMs)
    }, introDelayMs)

    return () => {
      window.clearTimeout(introTimer)
      if (interval !== undefined) window.clearInterval(interval)
    }
  }, [active, alternateFamily])

  return step
}
