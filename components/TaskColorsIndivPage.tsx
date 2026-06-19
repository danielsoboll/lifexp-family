'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS, PILL_BACK_CLASS } from '../lib/appShell'
import { oneLineTextInputProps } from '../lib/formInputAutofill'
import {
  defaultTaskColorLabels,
  TASK_COLOR_KEYS,
  taskColorDefinition,
  type TaskColorKey,
  type TaskColorLabels,
} from '../lib/taskColors'
import { fetchResolvedTaskColorLabels, saveTaskColorLabels } from '../lib/taskColorsIndiv'

export default function TaskColorsIndivPage() {
  const [labels, setLabels] = useState<TaskColorLabels>(() => defaultTaskColorLabels())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const reload = useCallback(async () => {
    const { labels: nextLabels, error } = await fetchResolvedTaskColorLabels()
    if (error) {
      setErrorMessage(error.message)
      return
    }
    setErrorMessage('')
    setLabels(nextLabels)
  }, [])

  useEffect(() => {
    void (async () => {
      await reload()
      setLoading(false)
    })()
  }, [reload])

  const setLabel = (colorKey: TaskColorKey, value: string) => {
    setLabels((current) => ({ ...current, [colorKey]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    setErrorMessage('')
    const { error } = await saveTaskColorLabels(labels)
    setSaving(false)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    setMessage('Bezeichnungen gespeichert.')
    await reload()
  }

  const defaults = defaultTaskColorLabels()

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/plus/aufgabenplaner" className={`${PILL_BACK_CLASS} mb-0`}>
            <span aria-hidden>←</span>
            Zurück
          </Link>
        </div>

        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Eigene Typ-Bezeichnungen
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Texte für die sechs Aufgaben-Farben im Aufgabenplaner
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Laden …</p>
        ) : (
          <section className="flex flex-col gap-4">
            {TASK_COLOR_KEYS.map((colorKey) => {
              const color = taskColorDefinition(colorKey)
              return (
                <div
                  key={colorKey}
                  className="rounded-2xl border-2 border-stone-400/90 bg-white p-4 dark:border-stone-600 dark:bg-stone-950/40"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className={`h-10 w-10 shrink-0 rounded-xl border-2 ${color.swatchClass}`} aria-hidden />
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Farbe {colorKey}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Standard: {defaults[colorKey]}
                      </p>
                    </div>
                  </div>
                  <label htmlFor={`task-color-label-${colorKey}`} className="sr-only">
                    Bezeichnung für Farbe {colorKey}
                  </label>
                  <input
                    id={`task-color-label-${colorKey}`}
                    {...oneLineTextInputProps(`lifexp-task-color-label-${colorKey}`)}
                    value={labels[colorKey]}
                    onChange={(event) => setLabel(colorKey, event.target.value)}
                    placeholder={defaults[colorKey]}
                    className="w-full rounded-2xl border-2 border-stone-400 bg-white px-4 py-3 text-base font-semibold text-slate-900 dark:border-stone-600 dark:bg-stone-950 dark:text-slate-100"
                  />
                </div>
              )
            })}

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="lifexp-pressable-3d w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3.5 text-sm font-bold text-white disabled:opacity-60 dark:border-emerald-500"
            >
              {saving ? 'Speichern …' : 'Speichern'}
            </button>
          </section>
        )}

        {message ? (
          <p className="mt-4 rounded-2xl border-2 border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100">
            {message}
          </p>
        ) : null}
        {errorMessage ? (
          <p
            className="mt-4 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>
    </main>
  )
}
