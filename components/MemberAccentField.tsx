'use client'

import { useState } from 'react'

import MemberAccentPickerSheet from './MemberAccentPickerSheet'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'
import { memberAccentStyle, type MemberAccentKey } from '../lib/family/memberAccentColor'

type MemberAccentFieldProps = {
  value: MemberAccentKey
  onChange: (next: MemberAccentKey) => void
  legend?: string
}

export default function MemberAccentField({ value, onChange, legend = 'Quest-Farbe' }: MemberAccentFieldProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const style = memberAccentStyle(value)

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-950 dark:text-slate-200">{legend}</p>
      <div className="flex items-stretch gap-2">
        <div
          className={`min-h-[2.75rem] flex-1 rounded-xl border-2 shadow-sm ${style.swatchClass}`}
          aria-hidden
        />
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={`${PRESSABLE_3D_CLASS} shrink-0 rounded-xl border-2 border-slate-400 bg-gradient-to-b from-slate-100 to-slate-200/90 px-3 py-2 text-xs font-bold text-slate-950 dark:border-slate-600 dark:from-slate-800 dark:to-slate-950 dark:text-slate-100`}
        >
          Farbe wählen
        </button>
      </div>

      {sheetOpen ? (
        <MemberAccentPickerSheet
          value={value}
          onChange={onChange}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}
    </div>
  )
}
