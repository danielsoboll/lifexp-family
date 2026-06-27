import type { DailyCrownMember } from './dailyCrown'

export const ONBOARDING_PREVIEW_FRITZ_MEMBER: DailyCrownMember = { type: 'child', id: 'c3' }
export const ONBOARDING_PREVIEW_F2_MAMA_MEMBER: DailyCrownMember = { type: 'parent', id: 'p2' }

/** Onboarding: Fritz nach Runterscroll, Familie 2 Mama ab letztem XP-Sprung. */
export function resolveOnboardingPreviewCrownWinner(input: {
  alternateFamily: boolean
  xpStep: number
  fritzCrownMoment: boolean
}): DailyCrownMember | null {
  if (!input.alternateFamily && input.fritzCrownMoment) {
    return ONBOARDING_PREVIEW_FRITZ_MEMBER
  }
  if (input.alternateFamily && input.xpStep >= 4) {
    return ONBOARDING_PREVIEW_F2_MAMA_MEMBER
  }
  return null
}
