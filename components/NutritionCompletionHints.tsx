'use client'

export function nutritionCompletionCloseLabel(yesterdayView: boolean): string {
  return yesterdayView ? 'Abschliessen für gestern!' : 'Abschliessen für heute!'
}

type NutritionCompletionHintsProps = {
  /** Zusatz unter dem grünen Hinweis (Ernährungs-Übersicht). */
  showEvaluationSubhint?: boolean
}

export default function NutritionCompletionHints({
  showEvaluationSubhint = false,
}: NutritionCompletionHintsProps) {
  return (
    <div className="mt-2 space-y-1 text-center">
      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        Aktualisierung jederzeit möglich
      </p>
      {showEvaluationSubhint ? (
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Individuelle Bewertung nach deinen Zielen und vorgegebenen Werten
        </p>
      ) : null}
    </div>
  )
}
