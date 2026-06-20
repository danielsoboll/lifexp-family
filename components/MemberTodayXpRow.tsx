import MemberDailyXpBar from './MemberDailyXpBar'
import MemberPortraitMini from './MemberPortraitMini'

type MemberTodayXpRowProps = {
  name: string
  todayXp: number
  avatarSrc?: string | null
  avatarError?: string | null
}

/** Verlauf/Statistik: Mini-Portrait links, Name + Tages-XP-Balken rechts. */
export default function MemberTodayXpRow({ name, todayXp, avatarSrc, avatarError }: MemberTodayXpRowProps) {
  return (
    <article className="flex items-start gap-2.5">
      <MemberPortraitMini src={avatarSrc} error={avatarError} />
      <div className="min-w-0 flex-1 pt-0.5">
        <h3 className="mb-0.5 truncate text-sm font-bold text-slate-900 dark:text-slate-100">{name}</h3>
        <MemberDailyXpBar todayXp={todayXp} compact boostWarm />
      </div>
    </article>
  )
}
