export type OnboardingPreviewHappyAllCaption = {
  headlineClassName: string
  message: string
  /** Getrennt vom Text — verhindert Emoji-Fallback als „r“ am Wortende. */
  trailingSymbol?: string
}

/** Happy-all-Banner — erste Zeile in der Onboarding-Vorschau (5 Schritte). */
export function onboardingPreviewHappyAllCaption(
  familyTodayXp: number,
  step: number,
): OnboardingPreviewHappyAllCaption {
  const xp = Math.max(0, Math.floor(familyTodayXp))
  const previewStep = Math.min(Math.max(0, Math.floor(step)), 4)

  switch (previewStep) {
    case 0:
      return {
        headlineClassName: 'text-orange-600 dark:text-orange-300',
        message: `${xp} XP heute — Guter Start!`,
      }
    case 1:
      return {
        headlineClassName: 'text-yellow-600 dark:text-yellow-400',
        message: `${xp} XP gesammelt — sehr gut`,
      }
    case 2:
      return {
        headlineClassName: 'text-lime-500 dark:text-lime-300',
        message: `${xp} XP gesammelt — Harter Kampf!`,
        trailingSymbol: '🔥',
      }
    case 3:
      return {
        headlineClassName: 'text-green-500 dark:text-green-300',
        message: `${xp} XP gesammelt — Wow! Weiter geht's!`,
      }
    default:
      return {
        headlineClassName: 'text-emerald-800 dark:text-emerald-500',
        message: `${xp} XP heute — ihr seid super als Familie!`,
      }
  }
}
