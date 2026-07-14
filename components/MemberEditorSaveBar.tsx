'use client'

import { PRESSABLE_3D_CLASS } from '../lib/appShell'
import { useVisualViewportLayout } from '../lib/useVisualViewportLayout'

type MemberEditorSaveBarProps = {
  loading?: boolean
  label?: string
}

export default function MemberEditorSaveBar({
  loading = false,
  label = 'Änderungen speichern',
}: MemberEditorSaveBarProps) {
  const { keyboardOpen, keyboardHeight } = useVisualViewportLayout()

  const button = (
    <button
      type="submit"
      disabled={loading}
      className={`${PRESSABLE_3D_CLASS} w-full rounded-lg border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60`}
    >
      {loading ? 'Speichern …' : label}
    </button>
  )

  if (keyboardOpen) {
    return (
      <div
        className="pointer-events-none fixed inset-x-0 z-[110] mx-auto max-w-lg px-4"
        style={{ bottom: Math.max(keyboardHeight + 56, 120) }}
      >
        <div className="pointer-events-auto rounded-xl border border-slate-300/90 bg-slate-100/98 p-2 shadow-lg backdrop-blur-md dark:border-slate-600/90 dark:bg-slate-900/98">
          {button}
        </div>
      </div>
    )
  }

  return <div className="mt-2 border-t border-slate-300/80 pt-2 dark:border-slate-600/80">{button}</div>
}
