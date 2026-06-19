'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import AlcoholLimitsFields from '../../../components/AlcoholLimitsFields'
import FlowHintArrow from '../../../components/FlowHintArrow'
import InfoButton from '../../../components/InfoButton'
import ThemeToggle from '../../../components/ThemeToggle'
import {
  EMPTY_ALCOHOL_LIMITS,
  alcoholLimitsFromProfile,
  parseAlcoholLimitsForm,
  type AlcoholLimitsFormState,
} from '../../../lib/alcoholUnits'
import { MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS, PILL_BACK_CLASS } from '../../../lib/appShell'
import { focusFormField } from '../../../lib/mobileFormFocus'
import {
  canEnableIndividualGoalFlags,
  PLANNER_TASK_XP_REDUCE_MESSAGE,
} from '../../../lib/plusXpBudget'
import {
  fetchCurrentProfile,
  isAlcoholTrackingEnabled,
  updateCurrentProfileAlcoholTracking,
  updateCurrentProfileZielvorgaben,
} from '../../../lib/profile'
import {
  clearZielvorgabenDraft,
  isZielvorgabenFormComplete,
  loadZielvorgabenDraft,
  markZielvorgabenCompleteLocal,
  saveZielvorgabenDraft,
  zielvorgabenHintSection,
} from '../../../lib/zielvorgaben'

function yesNoButtonClass(active: boolean): string {
  return `lifexp-pressable-3d rounded-2xl border-2 px-3 py-3 text-center text-sm font-bold leading-snug focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
    active
      ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 text-slate-900 ring-1 ring-emerald-200/80 dark:border-emerald-400 dark:from-emerald-950/55 dark:to-teal-950/45 dark:text-slate-100 dark:ring-emerald-700/45'
      : 'border-stone-400/90 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/70 text-slate-800 ring-1 ring-stone-500/18 hover:border-stone-500 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-slate-200 dark:ring-stone-600/30 dark:hover:border-slate-400'
  }`
}

function readInitialZielvorgabenState() {
  const draft = typeof window !== 'undefined' ? loadZielvorgabenDraft() : null
  if (draft) {
    return {
      alcoholTrack: draft.alcoholTrack,
      motivationDaily: draft.motivationDaily,
      alcoholLimits: draft.alcoholLimits,
      loading: false,
    }
  }
  return {
    alcoholTrack: null as boolean | null,
    motivationDaily: null as boolean | null,
    alcoholLimits: EMPTY_ALCOHOL_LIMITS,
    loading: true,
  }
}

export default function ZielvorgabenPage() {
  const router = useRouter()
  const initial = readInitialZielvorgabenState()
  const [alcoholTrack, setAlcoholTrack] = useState<boolean | null>(initial.alcoholTrack)
  const [motivationDaily, setMotivationDaily] = useState<boolean | null>(initial.motivationDaily)
  const [alcoholLimits, setAlcoholLimits] = useState<AlcoholLimitsFormState>(initial.alcoholLimits)
  const [loading, setLoading] = useState(initial.loading)
  const skipProfileHydrationRef = useRef(initial.loading === false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const prevAlcoholTrackRef = useRef<boolean | null>(null)

  useEffect(() => {
    if (loading) return
    if (alcoholTrack === true && prevAlcoholTrackRef.current !== true) {
      window.setTimeout(() => {
        focusFormField(document.getElementById('alkohol-wenig-menge'))
      }, 80)
    }
    prevAlcoholTrackRef.current = alcoholTrack
  }, [alcoholTrack, loading])

  useEffect(() => {
    if (loading) return
    saveZielvorgabenDraft({ alcoholTrack, motivationDaily, alcoholLimits })
  }, [alcoholTrack, motivationDaily, alcoholLimits, loading])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { settings, error } = await fetchCurrentProfile()
      if (cancelled) return
      if (error) {
        setLoading(false)
        setErrorMessage(error.message)
        return
      }
      if (!skipProfileHydrationRef.current && settings.motivationMode !== null) {
        setMotivationDaily(settings.motivationMode)
        setAlcoholTrack(isAlcoholTrackingEnabled(settings.alcoholMode))
        setAlcoholLimits(alcoholLimitsFromProfile(settings))
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const trySetAlcoholTrack = async (value: boolean) => {
    if (value) {
      const { allowed, error } = await canEnableIndividualGoalFlags({
        alcoholTracking: true,
        motivationTracking: motivationDaily === true,
      })
      if (!allowed) {
        setErrorMessage(error ?? PLANNER_TASK_XP_REDUCE_MESSAGE)
        return
      }
    }
    const previous = alcoholTrack
    setErrorMessage('')
    setAlcoholTrack(value)
    const { error } = await updateCurrentProfileAlcoholTracking(value)
    if (error) {
      setAlcoholTrack(previous)
      setErrorMessage(error.message)
    }
  }

  const trySetMotivationDaily = async (value: boolean) => {
    if (value) {
      const { allowed, error } = await canEnableIndividualGoalFlags({
        alcoholTracking: alcoholTrack === true,
        motivationTracking: true,
      })
      if (!allowed) {
        setErrorMessage(error ?? PLANNER_TASK_XP_REDUCE_MESSAGE)
        return
      }
    }
    setErrorMessage('')
    setMotivationDaily(value)
  }

  const hintSection = loading ? null : zielvorgabenHintSection(alcoholTrack, motivationDaily, alcoholLimits)
  const showFormHint = hintSection !== null

  const save = async () => {
    if (alcoholTrack === null || motivationDaily === null) {
      setErrorMessage('Bitte beide Fragen beantworten.')
      return
    }

    const { allowed, error: budgetError } = await canEnableIndividualGoalFlags({
      alcoholTracking: alcoholTrack,
      motivationTracking: motivationDaily,
    })
    if (!allowed) {
      setErrorMessage(budgetError ?? PLANNER_TASK_XP_REDUCE_MESSAGE)
      return
    }

    let limitsPatch = null
    if (alcoholTrack) {
      const parsed = parseAlcoholLimitsForm(alcoholLimits)
      if (!parsed.valid || !parsed.limits) {
        setErrorMessage('Bitte beide Alkohol-Limits vollständig ausfüllen (Menge, Einheit, Getränk).')
        return
      }
      limitsPatch = parsed.limits
    }

    setSaving(true)
    setErrorMessage('')
    const { error } = await updateCurrentProfileZielvorgaben({
      alcoholTrack,
      motivationDaily,
      alcoholLimits: limitsPatch,
    })
    setSaving(false)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    clearZielvorgabenDraft()
    markZielvorgabenCompleteLocal()
    router.push('/ziele')
  }

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/ziele" className={PILL_BACK_CLASS}>
            <span aria-hidden>←</span>
            Zurück zu Ziele
          </Link>
          <ThemeToggle />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Zielvorgaben</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Zwei kurze Fragen – deine Antworten werden im Profil gespeichert.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">Laden …</p>
        ) : (
          <div className="mt-6 flex flex-col gap-8">
            <section aria-labelledby="zielvorgaben-alkohol">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2
                    id="zielvorgaben-alkohol"
                    className="text-lg font-bold text-slate-900 dark:text-slate-100"
                  >
                    Alkohol mit tracken?
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    Wenn du gelegentlich oder öfter etwas trinkst sinnvoll.
                  </p>
                </div>
                <InfoButton
                  href="/ziele/zielvorgaben/alkohol/info"
                  label="Info zu Alkohol mit tracken"
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Alkohol tracken">
                <button
                  type="button"
                  onClick={() => void trySetAlcoholTrack(true)}
                  className={yesNoButtonClass(alcoholTrack === true)}
                >
                  Ja
                </button>
                <button
                  type="button"
                  onClick={() => void trySetAlcoholTrack(false)}
                  className={yesNoButtonClass(alcoholTrack === false)}
                >
                  Nein
                </button>
              </div>

              {alcoholTrack === true ? (
                <div className="mt-2 flex flex-col gap-1">
                  <AlcoholLimitsFields
                    idPrefix="alkohol-wenig"
                    title='Definiere dein „wenig“ Limit'
                    values={alcoholLimits}
                    onChange={setAlcoholLimits}
                    which="low"
                    onBlockComplete={() => {
                      focusFormField(document.getElementById('alkohol-viel-menge'))
                    }}
                  />
                  <AlcoholLimitsFields
                    idPrefix="alkohol-viel"
                    title='Definiere dein „viel“ Limit'
                    values={alcoholLimits}
                    onChange={setAlcoholLimits}
                    which="high"
                    onFlowComplete={() => {
                      document.getElementById('zielvorgaben-motivation')?.scrollIntoView({
                        block: 'nearest',
                        behavior: 'smooth',
                      })
                    }}
                  />
                </div>
              ) : null}
            </section>

            {hintSection === 'motivation' ? <FlowHintArrow /> : null}
            <section aria-labelledby="zielvorgaben-motivation">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2
                    id="zielvorgaben-motivation"
                    className="text-lg font-bold text-slate-900 dark:text-slate-100"
                  >
                    Motivation
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    Ja, tägliche Motivation hilft mir.
                  </p>
                </div>
                <InfoButton
                  href="/ziele/zielvorgaben/motivation/info"
                  label="Info zur täglichen Motivation"
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Tägliche Motivation">
                <button
                  type="button"
                  onClick={() => void trySetMotivationDaily(true)}
                  className={yesNoButtonClass(motivationDaily === true)}
                >
                  Ja
                </button>
                <button
                  type="button"
                  onClick={() => void trySetMotivationDaily(false)}
                  className={yesNoButtonClass(motivationDaily === false)}
                >
                  Nein
                </button>
              </div>
            </section>

            {hintSection === 'save' ? <FlowHintArrow /> : null}
            <button
              type="button"
              disabled={saving || !isZielvorgabenFormComplete(alcoholTrack, motivationDaily, alcoholLimits)}
              onClick={() => void save()}
              className={`lifexp-pressable-3d w-full rounded-2xl border-2 px-4 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                showFormHint
                  ? 'border-yellow-400 bg-gradient-to-b from-yellow-400 to-amber-500 dark:border-yellow-600 dark:from-yellow-600 dark:to-amber-700'
                  : 'border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 dark:border-emerald-500'
              }`}
            >
              {saving ? 'Speichern …' : 'Speichern'}
            </button>
          </div>
        )}

        {errorMessage ? (
          <p className="mt-4 text-sm text-red-700 dark:text-red-400" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </main>
  )
}
