'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { areaInfoHref } from '../lib/areaInfoNav'
import { MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS } from '../lib/appShell'
import {
  trainingChoiceButtonClass,
  trainingChoiceXpClass,
  type MovementTrainingChoiceTone,
} from '../lib/movementTraining'
import { fetchLatestTodaySelection, recordXpEvent } from '../lib/xpEvents'
import PageHeaderBar from './PageHeaderBar'

type MovementChoice = {
  label: string
  detail?: string
  xp: number
  tone?: MovementTrainingChoiceTone
}

const BEWEGUNG_INFO_SUBAREA: Record<string, string> = {
  arbeit: 'Arbeit',
  schritte: 'Schritte',
  training: 'Training',
}

type MovementChoicePageProps = {
  title: string
  subtitle: string
  emoji: string
  source: string
  choices: MovementChoice[]
  infoHref?: string
}

export default function MovementChoicePage({
  title,
  subtitle,
  emoji,
  source,
  choices,
  infoHref,
}: MovementChoicePageProps) {
  const resolvedInfoHref =
    infoHref ??
    (BEWEGUNG_INFO_SUBAREA[source] ? areaInfoHref(`/bewegung/${source}`) : undefined)
  const router = useRouter()
  const [selectedLabel, setSelectedLabel] = useState('')
  const [selectedXp, setSelectedXp] = useState(0)
  const [xpDelta, setXpDelta] = useState(0)
  const [justSaved, setJustSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { selection, error } = await fetchLatestTodaySelection({
        category: 'bewegung',
        source,
      })
      if (cancelled) return
      setLoading(false)
      if (error) {
        setErrorMessage(error.message)
        return
      }
      setErrorMessage('')
      if (selection) {
        setSelectedLabel(selection.label)
        setSelectedXp(selection.selectedXp)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [source])

  useEffect(() => {
    if (!justSaved) return
    const t = window.setTimeout(() => {
      router.push('/bewegung')
    }, 2000)
    return () => {
      window.clearTimeout(t)
    }
  }, [justSaved, router])

  const choose = async (choice: MovementChoice) => {
    if (saving) return
    setSaving(true)
    setJustSaved(false)
    const previousLabel = selectedLabel
    const previousXp = selectedXp
    const delta = choice.xp - previousXp
    const { error } = await recordXpEvent({
      category: 'bewegung',
      source,
      xp: delta,
      metadata: {
        label: choice.label,
        selected_xp: choice.xp,
        previous_label: previousLabel || null,
        previous_xp: previousXp,
      },
    })
    setSaving(false)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    setErrorMessage('')
    setSelectedLabel(choice.label)
    setSelectedXp(choice.xp)
    setXpDelta(delta)
    setJustSaved(true)
  }

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <PageHeaderBar
          backHref="/bewegung"
          infoHref={resolvedInfoHref}
          infoLabel={`Info zu ${subtitle}`}
        />

        <header className="mb-6 flex items-center gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-3xl ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:ring-emerald-800/60"
            aria-hidden
          >
            {emoji}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
        </header>

        {loading ? (
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Laden …</p>
        ) : null}

        <section className="flex flex-col gap-3" aria-label="Auswahl">
          {choices.map((choice) => {
            const selected = selectedLabel === choice.label
            const tone = choice.tone ?? 'default'
            return (
              <button
                key={choice.label}
                type="button"
                onClick={() => void choose(choice)}
                disabled={saving}
                className={trainingChoiceButtonClass(selected, tone)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold">{choice.label}</span>
                  {choice.detail ? (
                    <span className="mt-0.5 block text-sm font-medium text-slate-600 dark:text-slate-400">
                      {choice.detail}
                    </span>
                  ) : null}
                  <span className={trainingChoiceXpClass()}>XP + {choice.xp}</span>
                </span>
              </button>
            )
          })}
        </section>

        {justSaved ? (
          <p className="mt-4 rounded-2xl border-2 border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-center text-sm font-medium text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100">
            Gespeichert: {selectedLabel} ({xpDelta >= 0 ? '+' : ''}
            {xpDelta} XP). Zurück zu Training …
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mt-4 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </main>
  )
}
