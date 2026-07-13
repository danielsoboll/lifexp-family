'use client'

import { useCallback, useEffect, useState } from 'react'

import { useFamily } from './FamilyProvider'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'
import {
  APP_ERROR_EVENT,
  escapeToWelcomeHome,
  isChildNotbremseAudience,
  NOTBREMSE_AUTO_ESCAPE_MS,
  type AppErrorDetail,
} from '../lib/errorNotbremse'

type NotbremseState = {
  message: string
  where: AppErrorDetail['source']
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
  const { memberKind } = useFamily()
  const kidMode = isChildNotbremseAudience(memberKind)
  const [active, setActive] = useState<NotbremseState | null>(null)
  const [stay, setStay] = useState(false)
  const [escaping, setEscaping] = useState(false)

  const goHome = useCallback(() => {
    setEscaping(true)
    escapeToWelcomeHome()
  }, [])

  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      setActive({ where: 'unhandled', message: normalizeErrorMessage(event.reason) })
    }

    const onError = (event: ErrorEvent) => {
      setActive({ where: 'unhandled', message: normalizeErrorMessage(event.error ?? event.message) })
    }

    const onAppError = (event: Event) => {
      const detail = (event as CustomEvent<AppErrorDetail>).detail
      if (!detail?.message) return
      setActive({ where: detail.source, message: detail.message })
    }

    window.addEventListener('unhandledrejection', onUnhandledRejection)
    window.addEventListener('error', onError)
    window.addEventListener(APP_ERROR_EVENT, onAppError)
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
      window.removeEventListener('error', onError)
      window.removeEventListener(APP_ERROR_EVENT, onAppError)
    }
  }, [])

  useEffect(() => {
    if (!active || escaping) return
    if (!kidMode && stay) return

    const timer = window.setTimeout(() => {
      goHome()
    }, NOTBREMSE_AUTO_ESCAPE_MS)

    return () => window.clearTimeout(timer)
  }, [active, stay, escaping, kidMode, goHome])

  if (!active) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-label="Fehler"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-3xl border-2 border-rose-400/70 bg-white p-5 shadow-2xl dark:border-rose-700/70 dark:bg-slate-950">
        <h2 className="text-lg font-extrabold text-slate-950 dark:text-slate-50">
          {kidMode ? 'Ups!' : 'Ups — da ist etwas schiefgelaufen'}
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
          {escaping
            ? kidMode
              ? 'Gleich geht es weiter …'
              : 'Startseite wird geladen …'
            : kidMode
              ? 'Gleich geht es weiter.'
              : 'Wir bringen dich zurück zur Startseite.'}
        </p>

        <button
          type="button"
          disabled={escaping}
          onClick={goHome}
          className={`${PRESSABLE_3D_CLASS} mt-4 w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-extrabold text-white disabled:opacity-70 ${kidMode ? 'py-4 text-lg' : ''}`}
        >
          {escaping ? 'Einen Moment …' : kidMode ? 'Weiter' : 'Zurück zur Startseite'}
        </button>

        {!kidMode ? (
          <>
            <button
              type="button"
              disabled={escaping}
              onClick={() => setStay(true)}
              className="mt-3 w-full text-center text-sm font-semibold text-slate-700 underline underline-offset-4 disabled:opacity-60 dark:text-slate-300"
            >
              Hier bleiben
            </button>

            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-semibold text-slate-500 dark:text-slate-400">
                Details
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-slate-100 p-2 text-[11px] text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {active.where}: {active.message}
              </pre>
            </details>
          </>
        ) : null}
      </div>
    </div>
  )
}
