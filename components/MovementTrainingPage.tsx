'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { areaInfoHref } from '../lib/areaInfoNav'
import { MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS } from '../lib/appShell'
import {
  goalToggleButtonClass,
  parsePumpTrainingMode,
  PUMP_TRAINING_MODE_LABELS,
  pumpTrainingChoicesForMode,
  STANDARD_TRAINING_CHOICES,
  trainingChoiceButtonClass,
  trainingChoiceXpClass,
  type MovementTrainingChoice,
  type PumpTrainingMode,
} from '../lib/movementTraining'
import { fetchCurrentProfile } from '../lib/profile'
import { loadPrimaryGoal, type PrimaryGoal } from '../lib/storage'
import { fetchLatestTodaySelection, recordXpEvent } from '../lib/xpEvents'
import MovementChoicePage from './MovementChoicePage'
import PageHeaderBar from './PageHeaderBar'

function PumpTrainingFlow() {
  const router = useRouter()
  const [tagHeute, setTagHeute] = useState(false)
  const [trainingMode, setTrainingMode] = useState<PumpTrainingMode | null>(null)
  const [selectedLabel, setSelectedLabel] = useState('')
  const [selectedXp, setSelectedXp] = useState(0)
  const [xpDelta, setXpDelta] = useState(0)
  const [justSaved, setJustSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { selection, error } = await fetchLatestTodaySelection({
        category: 'bewegung',
        source: 'training',
      })
      if (cancelled) return
      setLoading(false)
      if (error) {
        setErrorMessage(error.message)
        return
      }
      setErrorMessage('')
      if (!selection) return

      const metadata = selection.metadata ?? {}
      const savedTagHeute = metadata.tag_heute === true || metadata.tag_heute === undefined
      const savedMode =
        parsePumpTrainingMode(metadata.training_mode) ??
        (selection.label ? 'pump_training' : null)

      setTagHeute(savedTagHeute)
      setTrainingMode(savedMode)
      setSelectedLabel(selection.label)
      setSelectedXp(selection.selectedXp)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!justSaved) return
    const t = window.setTimeout(() => {
      router.push('/bewegung')
    }, 2000)
    return () => {
      window.clearTimeout(t)
    }
  }, [justSaved, router])

  const detailChoices =
    tagHeute && trainingMode ? pumpTrainingChoicesForMode(trainingMode) : []

  const choose = async (choice: MovementTrainingChoice) => {
    if (saving || !tagHeute || !trainingMode) return
    setSaving(true)
    setJustSaved(false)
    const previousLabel = selectedLabel
    const previousXp = selectedXp
    const delta = choice.xp - previousXp
    const { error } = await recordXpEvent({
      category: 'bewegung',
      source: 'training',
      xp: delta,
      metadata: {
        label: choice.label,
        selected_xp: choice.xp,
        previous_label: previousLabel || null,
        previous_xp: previousXp,
        tag_heute: tagHeute,
        training_mode: trainingMode,
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

  const selectMode = (mode: PumpTrainingMode) => {
    setTrainingMode(mode)
    const nextChoices = pumpTrainingChoicesForMode(mode)
    if (selectedLabel && !nextChoices.some((item) => item.label === selectedLabel)) {
      setSelectedLabel('')
      setSelectedXp(0)
    }
  }

  const toggleTagHeute = () => {
    const next = !tagHeute
    setTagHeute(next)
    if (!next) {
      setTrainingMode(null)
      setSelectedLabel('')
      setSelectedXp(0)
    }
  }

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <PageHeaderBar
          backHref="/bewegung"
          infoHref={areaInfoHref('/bewegung/training')}
          infoLabel="Info zu Training"
        />

        <header className="mb-6 flex items-center gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-3xl ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:ring-emerald-800/60"
            aria-hidden
          >
            💪
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Hast du heute trainiert?
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Wie war dein Training?</p>
          </div>
        </header>

        <button
          type="button"
          disabled={saving}
          onClick={toggleTagHeute}
          className={`mb-4 w-full ${goalToggleButtonClass(tagHeute)}`}
          aria-pressed={tagHeute}
        >
          Tag heute
        </button>

        {tagHeute ? (
          <div
            className="mb-4 grid grid-cols-2 gap-2"
            role="group"
            aria-label="Training oder Regeneration"
          >
            {(['pump_training', 'regeneration'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={saving}
                onClick={() => selectMode(mode)}
                className={goalToggleButtonClass(trainingMode === mode)}
              >
                {PUMP_TRAINING_MODE_LABELS[mode]}
              </button>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Aktiviere „Tag heute“, um Pump/Training oder Regeneration einzutragen.
          </p>
        )}

        {loading ? (
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Laden …</p>
        ) : null}

        {detailChoices.length > 0 ? (
          <section className="flex flex-col gap-3" aria-label="Auswahl">
            {detailChoices.map((choice) => {
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
        ) : null}

        {justSaved ? (
          <p className="mt-4 rounded-2xl border-2 border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-center text-sm font-medium text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100">
            Gespeichert
            {trainingMode ? `: ${PUMP_TRAINING_MODE_LABELS[trainingMode]}` : ''} — {selectedLabel} ({xpDelta >= 0 ? '+' : ''}
            {xpDelta} XP). Zurück zu Training …
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

export default function MovementTrainingPage() {
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { settings: profile, error } = await fetchCurrentProfile()
      if (cancelled) return
      setPrimaryGoal(error ? loadPrimaryGoal() : profile.goalType)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (primaryGoal === null) {
    return (
      <main className={MAIN_SHELL_CLASS}>
        <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
          <p className="text-sm text-slate-500 dark:text-slate-400">Laden …</p>
        </div>
      </main>
    )
  }

  if (primaryGoal === 'pump') {
    return <PumpTrainingFlow />
  }

  return (
    <MovementChoicePage
      title="Hast du heute trainiert?"
      subtitle="Wie war dein Training?"
      emoji="💪"
      source="training"
      infoHref={areaInfoHref('/bewegung/training')}
      choices={STANDARD_TRAINING_CHOICES}
    />
  )
}
