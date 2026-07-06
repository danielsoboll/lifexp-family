'use client'

import type { ReactNode } from 'react'

type YesterdayOpenQuestsSectionProps = {
  children: ReactNode
  compact?: boolean
}

export default function YesterdayOpenQuestsSection({
  children,
  compact = false,
}: YesterdayOpenQuestsSectionProps) {
  return (
    <section aria-label="Offen von gestern" className={compact ? 'mt-5 space-y-2.5' : 'mt-8 space-y-3 border-t border-slate-200 pt-6 dark:border-slate-700'}>
      <div>
        <h2 className={`font-bold text-slate-900 dark:text-slate-100 ${compact ? 'text-base' : 'text-lg tracking-tight'}`}>
          Offen von gestern
        </h2>
      </div>
      {children}
    </section>
  )
}
