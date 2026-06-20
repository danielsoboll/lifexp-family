'use client'

import {
  MEMBER_ACCENT_LABELS,
  MEMBER_ACCENT_PALETTE,
  memberAccentStyle,
  type MemberAccentKey,
} from '../lib/family/memberAccentColor'

type MemberAccentPickerProps = {
  value: MemberAccentKey
  onChange: (next: MemberAccentKey) => void
  legend?: string
}

export default function MemberAccentPicker({ value, onChange, legend = 'Quest-Farbe' }: MemberAccentPickerProps) {
  return (
    <fieldset>
      <legend className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">{legend}</legend>
      <div className="grid grid-cols-4 gap-1.5">
        {MEMBER_ACCENT_PALETTE.map((key) => {
          const style = memberAccentStyle(key)
          const selected = value === key
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              aria-label={MEMBER_ACCENT_LABELS[key]}
              title={MEMBER_ACCENT_LABELS[key]}
              onClick={() => onChange(key)}
              className={`flex flex-col items-center gap-1 rounded-lg border-2 px-1 py-1.5 transition ${
                selected
                  ? 'border-emerald-600 ring-2 ring-emerald-400/50 dark:border-emerald-500 dark:ring-emerald-700/50'
                  : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <span className={`h-6 w-full rounded-md ${style.chipClass}`} aria-hidden />
              <span className="text-[10px] font-semibold leading-none text-slate-700 dark:text-slate-300">
                {MEMBER_ACCENT_LABELS[key]}
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
