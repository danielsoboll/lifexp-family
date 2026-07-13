'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type NotbremseState = {
  message: string
  where: 'unhandled' | 'error-boundary'
}

function normalizeErrorMessage(value: unknown): string {
  if (value instanceof Error) return value.message || 'Unbekannter Fehler'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return 'Unbekannter Fehler'
  }
}

export default function ErrorNotbremse() {
  const router = useRouter()
  const pathname = usePathname()
  const [active, setActive] = useState<NotbremseState | null>(null)
  const [stay, setStay] = useState(false)

  const autoTarget = useMemo(() => {
    // avoid loops if we're already on the start page
    return pathname === '/' ? null : '/'
  }, [pathname])

  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      setActive({ where: 'unhandled', message: normalizeErrorMessage(event.reason) })
    }

    const onError = (event: ErrorEvent) => {
      setActive({ where: 'unhandled', message: normalizeErrorMessage(event.error ?? event.message) })
    }

    window.addEventListener('unhandledrejection', onUnhandledRejection)
    window.addEventListener('error', onError)
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
      window.removeEventListener('error', onError)
    }
  }, [])

  useEffect(() => {
    if (!active) return
    if (stay) return
    if (!autoTarget) return
    const timer = window.setTimeout(() => {
      router.push(autoTarget)
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [active, stay, autoTarget, router])

  if (!active) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-label="Fehler"
    >
      <div className="w-full max-w-sm rounded-3xl border-2 border-rose-400/70 bg-white p-5 shadow-2xl dark:border-rose-700/70 dark:bg-slate-950">
        <h2 className="text-lg font-extrabold text-slate-950 dark:text-slate-50">Ups — da ist etwas schiefgelaufen</h2>
        <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
          Wir bringen dich zurück zur Startseite.
        </p>

        <button
          type="button"
          onClick={() => router.push('/')}
          className={`${PRESSABLE_3D_CLASS} mt-4 w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-extrabold text-white`}
        >
          Zurück zur Startseite
        </button>

        <button
          type="button"
          onClick={() => setStay(true)}
          className="mt-3 w-full text-center text-sm font-semibold text-slate-700 underline underline-offset-4 dark:text-slate-300"
        >
          Hier bleiben
        </button>

        {/* Keep details hidden but still helpful for debugging */}
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold text-slate-500 dark:text-slate-400">
            Details
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-slate-100 p-2 text-[11px] text-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {active.where}: {active.message}
          </pre>
        </details>
      </div>
    </div>
  )
}

