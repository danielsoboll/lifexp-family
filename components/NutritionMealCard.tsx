'use client'

import Link from 'next/link'

import {
  isExactMealEntry,
  isNothingEntry,
  isRoughEstimateEntry,
  MEAL_XP,
  type MealEntry,
  type MealType,
} from '../lib/nutrition'

type NutritionMealCardProps = {
  mealType: MealType
  label: string
  emoji: string
  subtitle?: string
  /** Standard-Mahlzeit vs. persönliches Ziel (lila). */
  variant?: 'default' | 'personal'
  done: boolean
  mealEntries: MealEntry[]
  saving: boolean
  onChooseNothing: () => void
}

export default function NutritionMealCard({
  mealType,
  label,
  emoji,
  subtitle,
  variant = 'default',
  done,
  mealEntries,
  saving,
  onChooseNothing,
}: NutritionMealCardProps) {
  const isPersonal = variant === 'personal'
  const hasEstimate = mealEntries.some((entry) => isRoughEstimateEntry(entry))
  const hasExact = mealEntries.some((entry) => isExactMealEntry(entry))
  const hasOnlyNothing = mealEntries.length === 1 && isNothingEntry(mealEntries[0])
  const mealParam = encodeURIComponent(mealType)

  const neutralButtonClass =
    'lifexp-pressable-3d rounded-xl border-2 border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 px-2 py-2 text-xs font-bold text-slate-800 hover:border-stone-500 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-slate-100'
  const nothingButtonClass = hasOnlyNothing
    ? 'lifexp-pressable-3d rounded-xl border-2 border-emerald-500 bg-emerald-50 px-2 py-2 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200/80 dark:border-emerald-600 dark:bg-emerald-950/45 dark:text-emerald-100 dark:ring-emerald-800/60'
    : neutralButtonClass
  const selectedButtonClass =
    'lifexp-pressable-3d rounded-xl border-2 border-emerald-500 bg-emerald-50 px-2 py-2 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200/80 dark:border-emerald-600 dark:bg-emerald-950/45 dark:text-emerald-100 dark:ring-emerald-800/60'
  const grobButtonClass = hasEstimate
    ? selectedButtonClass
    : done
      ? neutralButtonClass
      : 'lifexp-pressable-3d rounded-xl border-2 border-yellow-300 bg-gradient-to-b from-yellow-50 via-amber-50/95 to-yellow-200/75 px-2 py-2 text-xs font-bold text-amber-950 hover:border-yellow-400 dark:border-yellow-700 dark:from-yellow-950/50 dark:via-amber-950/35 dark:to-yellow-900/50 dark:text-yellow-100'
  const genauButtonClass = hasExact
    ? selectedButtonClass
    : done
      ? neutralButtonClass
      : 'lifexp-pressable-3d rounded-xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-50 via-emerald-100/90 to-emerald-200/70 px-2 py-2 text-xs font-bold text-emerald-950 hover:border-emerald-400 dark:border-emerald-700 dark:from-emerald-950/50 dark:via-emerald-950/40 dark:to-emerald-900/55 dark:text-emerald-100'

  const articleClass = isPersonal
    ? done
      ? 'border-emerald-400 bg-gradient-to-br from-violet-50 via-violet-50/80 to-emerald-50/90 ring-emerald-200/80 dark:border-emerald-600 dark:from-violet-950/50 dark:via-violet-950/35 dark:to-emerald-950/45 dark:ring-emerald-800/60'
      : 'border-violet-400/90 bg-gradient-to-b from-violet-50/95 via-violet-100/55 to-violet-200/65 ring-violet-300/45 dark:border-violet-700 dark:from-violet-950/45 dark:via-violet-950/30 dark:to-violet-900/40 dark:ring-violet-900/40'
    : done
      ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 ring-emerald-200/80 dark:border-emerald-600 dark:from-emerald-950/60 dark:to-teal-950/45 dark:ring-emerald-800/60'
      : 'border-stone-400/90 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/70 ring-stone-500/18 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:ring-stone-600/30'

  return (
    <article
      className={`rounded-2xl border-2 p-4 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.14)] ring-1 ${articleClass}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            {emoji}
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{label}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {subtitle
                ? `${subtitle} · +${MEAL_XP} XP`
                : done
                  ? `Heute gepflegt · +${MEAL_XP} XP`
                  : `Erfassen · +${MEAL_XP} XP`}
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onChooseNothing}
          disabled={saving}
          className={`${nothingButtonClass} disabled:opacity-60`}
        >
          Nichts
        </button>
        <Link href={`/ernaehrung/grob?meal=${mealParam}`} className={grobButtonClass}>
          Grob schätzen
        </Link>
        <Link href={`/ernaehrung/genau?meal=${mealParam}`} className={genauButtonClass}>
          Genauer eingeben
        </Link>
      </div>
    </article>
  )
}
