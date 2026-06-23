import HappyAllPortrait from './HappyAllPortrait'
import { CARD_SURFACE_CLASS } from '../lib/appShell'
import { FAMILY_DAILY_XP_NEXT_TIER_MIN } from '../lib/family/dailyXpDisplay'

type FamilyHappyAllBannerProps = {
  familyTodayXp: number
  /** Onboarding-Vorschau: Happy_all ↔ Happy_all_2 alle 2 s. */
  cycleImages?: boolean
  showAlternate?: boolean
}

export default function FamilyHappyAllBanner({
  familyTodayXp,
  cycleImages = false,
  showAlternate = false,
}: FamilyHappyAllBannerProps) {
  return (
    <section
      className={`${CARD_SURFACE_CLASS} overflow-hidden rounded-2xl p-1.5`}
      aria-label={`Familie hat heute ${familyTodayXp} XP gesammelt — gemeinsames Tagesziel erreicht`}
    >
      <HappyAllPortrait className="w-full rounded-xl" cycle={cycleImages} showAlternate={showAlternate} />
      <p className="px-1 pt-2 text-center text-sm font-semibold text-emerald-800 dark:text-emerald-200">
        {familyTodayXp} XP heute — ihr seid super als Familie!
      </p>
      <p className="pb-0.5 text-center text-[11px] text-slate-950 dark:text-slate-400">
        Nächste Stufe bei {FAMILY_DAILY_XP_NEXT_TIER_MIN} XP
      </p>
    </section>
  )
}
