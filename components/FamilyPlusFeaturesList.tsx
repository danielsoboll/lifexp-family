import { FAMILY_PLUS_FEATURES } from '../lib/family/familyPlusFeatures'

type FamilyPlusFeaturesListProps = {
  className?: string
}

export default function FamilyPlusFeaturesList({ className = 'mt-4' }: FamilyPlusFeaturesListProps) {
  return (
    <ul className={`${className} space-y-2.5`}>
      {FAMILY_PLUS_FEATURES.map((feature) => (
        <li
          key={feature.id}
          className="flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50/60 px-3 py-3 dark:border-amber-900/50 dark:bg-amber-950/25"
        >
          <span className="text-2xl leading-none" aria-hidden>
            {feature.emoji}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{feature.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-950 dark:text-slate-300">
              {feature.description}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
