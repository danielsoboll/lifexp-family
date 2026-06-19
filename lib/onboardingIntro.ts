import { ONBOARDING_INTRO_AVATAR_SEQUENCE } from './avatarLibrary'

/** Standard-Anzeigedauer pro Intro-Slide (ms). */
export const INTRO_AVATAR_SLIDE_MS = 1500

/** Zusatz für erstes und letztes Bild (+0,5 s je). */
export const INTRO_AVATAR_EDGE_SLIDE_EXTRA_MS = 500

/** Gesamtdauer der Slideshow bis zum Onboarding-Sheet (ms). */
export function introSlideHoldMs(slideIndex: number, slideCount: number): number {
  if (slideCount <= 0) return 0
  let ms = INTRO_AVATAR_SLIDE_MS
  if (slideIndex === 0 || slideIndex === slideCount - 1) {
    ms += INTRO_AVATAR_EDGE_SLIDE_EXTRA_MS
  }
  return ms
}

export function introSlideshowTotalMs(
  slideCount: number = ONBOARDING_INTRO_AVATAR_SEQUENCE.length,
): number {
  let total = 0
  for (let i = 0; i < slideCount; i += 1) {
    total += introSlideHoldMs(i, slideCount)
  }
  return total
}

export const INTRO_HOLD_MS = introSlideshowTotalMs()

/** Verbleibende Sekunden bis das Onboarding-Sheet erscheint (Slideshow). */
export function secondsUntilIntroSheet(elapsedMs: number): number {
  return Math.max(0, Math.ceil((INTRO_HOLD_MS - elapsedMs) / 1000))
}

export const PRE_ONBOARDING_WELCOME_HEADLINE = 'Willkommen bei LifeXP!'

export const PRE_ONBOARDING_WELCOME_SUBLINE = 'Gleich kannst du dein Profil anlegen'

export const PRE_ONBOARDING_WELCOME_FREE_LINE = 'kostenlos - dauert etwa 30 sek'

/** Countdown-Zeile unter dem Willkommenstext; `null` wenn kein Zähler nötig. */
export function preOnboardingTapHintCounter(
  seconds: number,
  sheetInteractive: boolean,
): string | null {
  if (sheetInteractive) {
    return 'Tippe unten auf Weiter.'
  }
  if (seconds <= 0) {
    return 'Gleich geht’s los …'
  }
  const unit = seconds === 1 ? 'Sekunde' : 'Sekunden'
  return `${seconds} ${unit}`
}
