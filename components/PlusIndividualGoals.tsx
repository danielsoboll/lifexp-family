'use client'

import DashboardButton from './DashboardButton'

type PlusIndividualGoalsProps = {
  showAlcohol: boolean
  showGlaubenssatz: boolean
  alcoholDone?: boolean
  glaubenssatzDone?: boolean
}

export default function PlusIndividualGoals({
  showAlcohol,
  showGlaubenssatz,
  alcoholDone = false,
  glaubenssatzDone = false,
}: PlusIndividualGoalsProps) {
  if (!showAlcohol && !showGlaubenssatz) {
    return null
  }

  return (
    <section
      className="rounded-2xl border-2 border-violet-300/85 bg-gradient-to-b from-violet-50/90 via-violet-50/40 to-stone-100/80 p-4 ring-1 ring-violet-200/50 dark:border-violet-800 dark:from-violet-950/35 dark:via-violet-950/20 dark:to-stone-950/80 dark:ring-violet-900/40"
      aria-labelledby="plus-individual-goals-heading"
    >
      <h2
        id="plus-individual-goals-heading"
        className="text-sm font-bold uppercase tracking-wide text-violet-950 dark:text-violet-100"
      >
        Individuelle Ziele
      </h2>
      <div className="mt-3 flex flex-col gap-3">
        {showAlcohol ? (
          <DashboardButton
            href="/plus/alkohol"
            emoji="🍺"
            title="Alkohol"
            subtitle="Heutigen Konsum eintragen"
            status={alcoholDone ? 'done' : undefined}
          />
        ) : null}
        {showGlaubenssatz ? (
          <DashboardButton
            href="/plus/glaubenssatz"
            emoji="✨"
            title="Glaubenssatz"
            subtitle="Dein Satz für heute"
            status={glaubenssatzDone ? 'done' : undefined}
          />
        ) : null}
      </div>
    </section>
  )
}
