import HappyAllPortrait from './HappyAllPortrait'
import { CARD_SURFACE_CLASS } from '../lib/appShell'
import { familyNextXpMilestone } from '../lib/family/dailyXpDisplay'
import { onboardingPreviewHappyAllCaption } from '../lib/family/onboardingPreviewHappyAllCaption'

type FamilyHappyAllBannerProps = {
  familyTodayXp: number
  /** Onboarding-Vorschau: Happy_all ↔ Happy_all_2 — wechselt mit dem Familien-Set. */
  cycleImages?: boolean
  showAlternate?: boolean
  /** Onboarding: Unterschrift + Farbe nach XP-Schritt. */
  previewXpStep?: number
}

export default function FamilyHappyAllBanner({
  familyTodayXp,
  cycleImages = false,
  showAlternate = false,
  previewXpStep,
}: FamilyHappyAllBannerProps) {
  const nextMilestone = familyNextXpMilestone(familyTodayXp)
  const previewCaption =
    previewXpStep !== undefined
      ? onboardingPreviewHappyAllCaption(familyTodayXp, previewXpStep)
      : null

  return (
    <section
      className={`${CARD_SURFACE_CLASS} overflow-hidden rounded-2xl p-1.5`}
      aria-label={`Familie hat heute ${familyTodayXp} XP gesammelt — gemeinsames Tagesziel erreicht`}
    >
      <HappyAllPortrait className="w-full rounded-xl" cycle={cycleImages} showAlternate={showAlternate} />
      <p
        className={`px-1 pt-2 text-center text-sm font-semibold transition-colors duration-500 [font-variant-ligatures:none] ${
          previewCaption?.headlineClassName ?? 'text-emerald-800 dark:text-emerald-200'
        }`}
      >
        {previewCaption?.message ?? `${familyTodayXp} XP heute — ihr seid super als Familie!`}
        {previewCaption?.trailingSymbol ? (
          <>
            <span aria-hidden>{'\u200C'}</span>
            <span className="ml-0.5 inline-block align-baseline" aria-hidden>
              {previewCaption.trailingSymbol}
            </span>
          </>
        ) : null}
      </p>
      <p className="pb-0.5 text-center text-[11px] text-slate-950 dark:text-slate-400">
        Nächste Stufe bei {nextMilestone} XP
      </p>
    </section>
  )
}
