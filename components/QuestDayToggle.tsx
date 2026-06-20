'use client'

import type { QuestDayChoice } from '../lib/family/questRules'
import { CARD_SURFACE_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

type QuestDayToggleProps = {
  value: QuestDayChoice
  onChange: (next: QuestDayChoice) => void
}

export default function QuestDayToggle({ value, onChange }: QuestDayToggleProps) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Wann?</p>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            { id: 'today' as const, label: 'Heute', emoji: '☀️' },
            { id: 'tomorrow' as const, label: 'Morgen', emoji: '🌙' },
          ] as const
        ).map((option) => {
          const active = value === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`${PRESSABLE_3D_CLASS} ${CARD_SURFACE_CLASS} rounded-2xl border-2 px-3 py-3 text-center transition-colors ${
                active
                  ? 'border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40'
                  : 'border-transparent'
              }`}
            >
              <span className="text-xl" aria-hidden>
                {option.emoji}
              </span>
              <span className="mt-1 block text-sm font-bold text-slate-900 dark:text-slate-100">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
