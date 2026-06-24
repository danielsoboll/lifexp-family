'use client'

import { useCallback } from 'react'

import {
  ONBOARDING_PROMO_FREE_LINE,
  ONBOARDING_PROMO_HEADLINE,
  ONBOARDING_PROMO_SUBLINE,
} from '../lib/family/onboardingPromoBanner'

type OnboardingPromoBannerProps = {
  onActivate: () => void
  onAutoDismiss: () => void
}

/** LifeXP-Hinweis — sichtbar während Familie 2; Tippen öffnet das Willkommen-Sheet. */
export default function OnboardingPromoBanner({ onActivate, onAutoDismiss }: OnboardingPromoBannerProps) {
  const handleActivate = useCallback(() => {
    onAutoDismiss()
    onActivate()
  }, [onAutoDismiss, onActivate])

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[30]"
      role="status"
      aria-live="polite"
    >
      <div
        className="absolute inset-0 bg-slate-950/18 transition-opacity duration-500"
        aria-hidden
      />
      <div className="relative flex h-full items-center justify-center px-6">
        <div
          role="button"
          tabIndex={0}
          aria-label={`${ONBOARDING_PROMO_HEADLINE} ${ONBOARDING_PROMO_SUBLINE} ${ONBOARDING_PROMO_FREE_LINE}. Tippen zum Starten.`}
          className="lifexp-onboarding-promo-settle pointer-events-auto max-w-sm cursor-pointer rounded-2xl bg-black/40 px-4 py-8 shadow-[0_0_28px_8px_rgba(255,255,255,0.85),0_0_56px_16px_rgba(255,255,255,0.45)] backdrop-blur-sm sm:max-w-md sm:px-5 sm:py-9"
          onClick={(event) => {
            event.stopPropagation()
            handleActivate()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              handleActivate()
            }
          }}
        >
          <p className="text-balance text-center text-2xl font-bold leading-snug text-white sm:text-3xl">
            {ONBOARDING_PROMO_HEADLINE}
          </p>
          <p className="mt-3 text-balance text-center text-base font-medium leading-snug text-amber-200/90 sm:text-lg">
            {ONBOARDING_PROMO_SUBLINE}
          </p>
          <p className="mt-1 text-center text-sm font-medium text-amber-200/80 sm:text-base">
            {ONBOARDING_PROMO_FREE_LINE}
          </p>
        </div>
      </div>
    </div>
  )
}
