import { CARD_SURFACE_CLASS } from '../lib/appShell'
import { FAMILY_DAILY_XP_HAPPY_ALL_MIN, HAPPY_ALL_PORTRAIT_SRC } from '../lib/family/dailyXpDisplay'

type FamilyHappyAllBannerProps = {
  familyTodayXp: number
}

export default function FamilyHappyAllBanner({ familyTodayXp }: FamilyHappyAllBannerProps) {
  return (
    <section
      className={`${CARD_SURFACE_CLASS} overflow-hidden rounded-2xl p-1.5`}
      aria-label={`Familie hat heute ${familyTodayXp} XP gesammelt — gemeinsames Tagesziel erreicht`}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HAPPY_ALL_PORTRAIT_SRC}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </div>
      <p className="px-1 pt-2 text-center text-sm font-semibold text-emerald-800 dark:text-emerald-200">
        {familyTodayXp} XP heute — ihr seid super als Familie!
      </p>
      <p className="pb-0.5 text-center text-[11px] text-slate-600 dark:text-slate-400">
        Gemeinsam ab {FAMILY_DAILY_XP_HAPPY_ALL_MIN} XP am Tag
      </p>
    </section>
  )
}
