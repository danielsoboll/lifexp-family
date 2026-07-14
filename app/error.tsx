'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

import { useFamily } from '../components/FamilyProvider'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'
import {
  escapeAfterAppCrash,
  isChildNotbremseAudience,
  NOTBREMSE_AUTO_ESCAPE_MS,
} from '../lib/errorNotbremse'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const pathname = usePathname()
  const { memberKind } = useFamily()
  const kidMode = isChildNotbremseAudience(memberKind)
  const [stay, setStay] = useState(false)
  const [escaping, setEscaping] = useState(false)

  const goBack = useCallback(() => {
    setEscaping(true)
    escapeAfterAppCrash(pathname)
  }, [pathname])

  useEffect(() => {
    if (escaping) return
    if (!kidMode && stay) return

    const timer = window.setTimeout(() => {
      goBack()
    }, NOTBREMSE_AUTO_ESCAPE_MS)

    return () => window.clearTimeout(timer)
  }, [stay, escaping, kidMode, goBack])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg items-center justify-center px-4 py-8">
      <div className="w-full rounded-3xl border-2 border-rose-400/70 bg-white p-6 shadow-xl dark:border-rose-700/70 dark:bg-slate-950">
        <h1 className="text-xl font-extrabold text-slate-950 dark:text-slate-50">
          {kidMode ? 'Ups!' : 'Ups — da ist etwas schiefgelaufen'}
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
          {escaping
            ? 'Einen Moment …'
            : kidMode
              ? 'Gleich geht es zurück.'
              : 'Wir gehen zurück zur Familie.'}
        </p>

        <button
          type="button"
          disabled={escaping}
          onClick={goBack}
          className={`${PRESSABLE_3D_CLASS} mt-4 w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-extrabold text-white disabled:opacity-70 ${kidMode ? 'py-4 text-lg' : ''}`}
        >
          {escaping ? 'Einen Moment …' : 'Zurück'}
        </button>

        {!kidMode ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={escaping}
                onClick={() => {
                  setStay(true)
                  reset()
                }}
                className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-slate-300 bg-gradient-to-b from-slate-100 to-slate-200 px-3 py-2.5 text-sm font-bold text-slate-900 disabled:opacity-70 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900 dark:text-slate-100`}
              >
                Nochmal versuchen
              </button>
              <button
                type="button"
                disabled={escaping}
                onClick={() => setStay(true)}
                className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-slate-300 bg-gradient-to-b from-slate-100 to-slate-200 px-3 py-2.5 text-sm font-bold text-slate-900 disabled:opacity-70 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900 dark:text-slate-100`}
              >
                Hier bleiben
              </button>
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-semibold text-slate-500 dark:text-slate-400">
                Details
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-slate-100 p-2 text-[11px] text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {error?.message}
              </pre>
            </details>
          </>
        ) : null}
      </div>
    </main>
  )
}
