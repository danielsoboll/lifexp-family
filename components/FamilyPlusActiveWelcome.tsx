import { FAMILY_PLUS_ACTIVE_WELCOME } from '../lib/family/familyPlusFeatures'

type FamilyPlusActiveWelcomeProps = {
  className?: string
  compact?: boolean
}

export default function FamilyPlusActiveWelcome({
  className = '',
  compact = false,
}: FamilyPlusActiveWelcomeProps) {
  const { headline, body, availableHeading, availableItems } = FAMILY_PLUS_ACTIVE_WELCOME

  return (
    <div
      className={`rounded-2xl border-2 border-emerald-400/80 bg-gradient-to-b from-emerald-50 via-emerald-50/95 to-emerald-100/70 px-4 py-3.5 ring-1 ring-emerald-300/40 dark:border-emerald-700/70 dark:from-emerald-950/45 dark:via-emerald-950/35 dark:to-emerald-900/25 dark:ring-emerald-800/35 ${className}`.trim()}
    >
      <p className={`font-bold text-emerald-950 dark:text-emerald-100 ${compact ? 'text-sm' : 'text-base'}`}>
        {headline}
      </p>
      <div className={`space-y-1 text-emerald-900/95 dark:text-emerald-100/90 ${compact ? 'mt-2 text-xs' : 'mt-2.5 text-sm'}`}>
        {body.map((line) => (
          <p key={line} className="leading-relaxed">
            {line}
          </p>
        ))}
      </div>
      <div className={compact ? 'mt-3' : 'mt-4'}>
        <p className={`font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200 ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {availableHeading}
        </p>
        <ul className={`mt-2 space-y-1.5 ${compact ? 'text-xs' : 'text-sm'}`}>
          {availableItems.map((item) => (
            <li key={item.label} className="flex items-start gap-2 text-emerald-950 dark:text-emerald-50">
              <span className="shrink-0 leading-none" aria-hidden>
                {item.emoji}
              </span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
