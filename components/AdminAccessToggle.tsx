'use client'

type AdminAccessToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export default function AdminAccessToggle({ checked, onChange, disabled = false }: AdminAccessToggleProps) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900 ${
        disabled ? 'cursor-not-allowed opacity-60' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
      />
      <span>
        <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">Admin-Zugang</span>
        <span className="block text-xs text-slate-600 dark:text-slate-400">
          Darf Admin-Bereich und Familienverwaltung nutzen
        </span>
      </span>
    </label>
  )
}
