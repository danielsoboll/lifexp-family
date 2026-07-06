'use client'

import { PERSONAL_GOAL_SYMBOLS, type PersonalGoalSymbolId } from '../lib/family/personalGoalSymbols'

type PersonalGoalSymbolPickerProps = {
  value: PersonalGoalSymbolId | ''
  onChange: (symbolId: PersonalGoalSymbolId) => void
  disabled?: boolean
}

export default function PersonalGoalSymbolPicker({
  value,
  onChange,
  disabled = false,
}: PersonalGoalSymbolPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-5">
      {PERSONAL_GOAL_SYMBOLS.map((symbol) => {
        const selected = value === symbol.id
        return (
          <button
            key={symbol.id}
            type="button"
            disabled={disabled}
            title={symbol.label}
            aria-label={symbol.label}
            aria-pressed={selected}
            onClick={() => onChange(symbol.id)}
            className={`flex items-center justify-center rounded-xl border-2 px-1 py-2 text-center transition disabled:opacity-50 ${
              selected
                ? 'border-amber-500 bg-amber-100 dark:border-amber-600 dark:bg-amber-950/50'
                : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'
            }`}
          >
            <span className="text-2xl leading-none" aria-hidden>
              {symbol.emoji}
            </span>
          </button>
        )
      })}
    </div>
  )
}
