'use client'

import SheetPortal from './SheetPortal'
import { CARD_SURFACE_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'
import { MEMBER_ACCENT_PALETTE, memberAccentStyle, type MemberAccentKey } from '../lib/family/memberAccentColor'

type MemberAccentPickerSheetProps = {
  value: MemberAccentKey
  onChange: (next: MemberAccentKey) => void
  onClose: () => void
}

export default function MemberAccentPickerSheet({ value, onChange, onClose }: MemberAccentPickerSheetProps) {
  return (
    <SheetPortal>
      <div
        className="fixed inset-0 z-[120] flex flex-col justify-end bg-slate-950/45 dark:bg-black/55"
        onClick={onClose}
        role="presentation"
      >
        <div
          className={`lifexp-bottom-sheet ${CARD_SURFACE_CLASS} rounded-t-3xl px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl`}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-accent-picker-title"
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-400/70 dark:bg-slate-500" />
          <h2 id="member-accent-picker-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Quest-Farbe wählen
          </h2>
          <p className="mt-1 text-sm text-slate-950 dark:text-slate-400">
            So sehen Quests dieses Mitglieds in der Übersicht aus.
          </p>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {MEMBER_ACCENT_PALETTE.map((key, index) => {
              const style = memberAccentStyle(key)
              const selected = value === key
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`Farbe ${index + 1}${selected ? ' (gewählt)' : ''}`}
                  onClick={() => {
                    onChange(key)
                    onClose()
                  }}
                  className={`rounded-xl border-2 p-1 transition ${
                    selected
                      ? 'border-emerald-600 ring-2 ring-emerald-400/50 dark:border-emerald-500 dark:ring-emerald-700/50'
                      : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <span className={`block h-12 w-full rounded-lg ${style.swatchClass}`} aria-hidden />
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`${PRESSABLE_3D_CLASS} mt-5 w-full rounded-xl border-2 border-slate-400 bg-gradient-to-b from-slate-100 to-slate-300 px-4 py-3 text-sm font-bold text-slate-900 dark:border-slate-600 dark:from-slate-700 dark:to-slate-900 dark:text-slate-100`}
          >
            Schließen
          </button>
        </div>
      </div>
    </SheetPortal>
  )
}
