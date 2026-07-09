'use client'

import type { QuestDayChoice } from '../lib/family/questRules'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type QuestDayToggleProps = {
  value: QuestDayChoice
  onChange: (next: QuestDayChoice) => void
}

const DAY_OPTIONS = [
  { id: 'today' as const, label: 'Heute', emoji: '☀️' },
  { id: 'tomorrow' as const, label: 'Morgen', emoji: '🌙' },
] as const

export default function QuestDayToggle({ value, onChange }: QuestDayToggleProps) {
  return (
    <fieldset>
      <legend className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-100">Wann?</legend>
      <div className="grid grid-cols-2 gap-2">
        {DAY_OPTIONS.map((option) => {
          const active = value === option.id
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.id)}
              className={`lifexp-day-toggle ${PRESSABLE_3D_CLASS} flex min-h-0 flex-col items-center justify-center rounded-xl border-2 px-2.5 py-2 text-center transition-[border-color,background-color,box-shadow,color] ${
                active
                  ? 'border-emerald-600 bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-900/25 ring-2 ring-emerald-300/60 dark:border-emerald-500 dark:from-emerald-600 dark:via-emerald-700 dark:to-emerald-800 dark:ring-emerald-600/50'
                  : 'border-slate-300 bg-white text-slate-950 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'
              }`}
            >
              <span className="text-lg leading-none" aria-hidden>
                {option.emoji}
              </span>
              <span
                className={`mt-1 block text-xs font-bold ${active ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}
              >
                {option.label}
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
