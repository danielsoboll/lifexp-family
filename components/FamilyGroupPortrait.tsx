import { HAPPY_ALL_PORTRAIT_SRC } from '../lib/family/dailyXpDisplay'

type FamilyGroupPortraitProps = {
  className?: string
}

export default function FamilyGroupPortrait({ className = '' }: FamilyGroupPortraitProps) {
  return (
    <div
      className={`relative aspect-[5/4] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 ${className}`.trim()}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HAPPY_ALL_PORTRAIT_SRC}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
    </div>
  )
}
