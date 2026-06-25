import { ONBOARDING_PREVIEW_FAMILY_INTRO_MS } from './onboardingPreviewFamily'

/** XP-Sprünge — Mitglieder und Banner-Unterschrift gemeinsam alle 2 s (5 Schritte / 10 s). */
export const ONBOARDING_PREVIEW_STEP_MS = 2000

export type OnboardingPreviewXpStep = {
  p1: number
  p2: number
  c1: number
  c2: number
  c3?: number
}

/**
 * Familie 1 — nur c1/c2: Start 2 XP, abwechselnd +5 / +8, sinnvolle Portrait-Stufen (max. 15 XP).
 * Eltern + Fritz: unverändert.
 */
export const ONBOARDING_PREVIEW_XP_TIMELINE_SET_1: readonly OnboardingPreviewXpStep[] = [
  { p1: 2, p2: 4, c1: 2, c2: 2, c3: 4 },
  { p1: 5, p2: 5, c1: 7, c2: 2, c3: 5 },
  { p1: 5, p2: 10, c1: 7, c2: 7, c3: 10 },
  { p1: 10, p2: 10, c1: 12, c2: 7, c3: 15 },
  { p1: 10, p2: 22, c1: 12, c2: 15, c3: 22 },
]

/** Vorberechnete Familien-Summen pro Schritt — sync mit Timeline-Zeile. */
export const ONBOARDING_PREVIEW_FAMILY_SUMS_SET_1: readonly number[] =
  ONBOARDING_PREVIEW_XP_TIMELINE_SET_1.map(
    (frame) => frame.p1 + frame.p2 + frame.c1 + frame.c2 + (frame.c3 ?? 0),
  )

/** Familie 2 — Papa langsam, Mama endet bei 22 XP; Can/Elif abwechselnd: einer legt zu, der andere bleibt (beide 21). */
export const ONBOARDING_PREVIEW_XP_TIMELINE_SET_2: readonly OnboardingPreviewXpStep[] = [
  { p1: 3, p2: 5, c1: 5, c2: 4 },
  { p1: 5, p2: 10, c1: 12, c2: 4 },
  { p1: 8, p2: 14, c1: 12, c2: 14 },
  { p1: 11, p2: 18, c1: 21, c2: 14 },
  { p1: 14, p2: 22, c1: 21, c2: 21 },
]

export const ONBOARDING_PREVIEW_FAMILY_SUMS_SET_2: readonly number[] =
  ONBOARDING_PREVIEW_XP_TIMELINE_SET_2.map((frame) => frame.p1 + frame.p2 + frame.c1 + frame.c2)

export function onboardingPreviewXpTimeline(alternateFamily: boolean): readonly OnboardingPreviewXpStep[] {
  return alternateFamily ? ONBOARDING_PREVIEW_XP_TIMELINE_SET_2 : ONBOARDING_PREVIEW_XP_TIMELINE_SET_1
}

export function onboardingPreviewXpStepMs(_alternateFamily: boolean): number {
  return ONBOARDING_PREVIEW_STEP_MS
}

export function sumPreviewFamilyTodayXp(step: number, alternateFamily: boolean): number {
  const sums = alternateFamily ? ONBOARDING_PREVIEW_FAMILY_SUMS_SET_2 : ONBOARDING_PREVIEW_FAMILY_SUMS_SET_1
  const index = Math.min(Math.max(0, step), sums.length - 1)
  return sums[index] ?? 0
}

export function previewMemberTodayXp(
  memberId: string,
  step: number,
  alternateFamily: boolean,
): number | undefined {
  const timeline = onboardingPreviewXpTimeline(alternateFamily)
  const frame = timeline[Math.min(Math.max(0, step), timeline.length - 1)]
  const keyByMember: Record<string, keyof OnboardingPreviewXpStep> = {
    p1: 'p1',
    p2: 'p2',
    c1: 'c1',
    c2: 'c2',
    c3: 'c3',
  }
  const key = keyByMember[memberId]
  if (!key) return undefined
  const value = frame[key]
  return typeof value === 'number' ? value : undefined
}
