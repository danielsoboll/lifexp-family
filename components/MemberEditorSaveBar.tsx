'use client'

import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type MemberEditorSaveBarProps = {
  loading?: boolean
  label?: string
}

export default function MemberEditorSaveBar({
  loading = false,
  label = 'Änderungen speichern',
}: MemberEditorSaveBarProps) {
  return (
    <div className="sticky bottom-0 z-10 -mx-3 mt-1 border-t border-slate-300/80 bg-slate-100/95 px-3 py-2 backdrop-blur-md dark:border-slate-600/80 dark:bg-slate-900/95">
      <button
        type="submit"
        disabled={loading}
        className={`${PRESSABLE_3D_CLASS} w-full rounded-lg border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-60`}
      >
        {loading ? 'Speichern …' : label}
      </button>
    </div>
  )
}
