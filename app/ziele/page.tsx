'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import DashboardButton from '../../components/DashboardButton'
import FlowHintArrow from '../../components/FlowHintArrow'
import ThemeToggle from '../../components/ThemeToggle'
import { fetchZielvorgabenComplete } from '../../lib/zielvorgaben'
import {
  clearLocalXpAndKnowledgeState,
  resetAllUserAccountData,
  resetAllXpProgressData,
} from '../../lib/accountReset'
import { MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS, PILL_BACK_CLASS } from '../../lib/appShell'
import {
  canShowDanProfileDevLogin,
  isDanProfileOverrideActive,
  loginAsDanProfile,
  logoutDanProfile,
  shouldPersistLocalProfilePrefs,
} from '../../lib/user'
import GoalOptionLabel from '../../components/GoalOptionLabel'
import GoalTextInput from '../../components/GoalTextInput'
import {
  fetchCurrentProfile,
  updateCurrentProfileGoal,
  updateCurrentProfileGoalText,
} from '../../lib/profile'
import {
  DEFAULT_PRIMARY_GOAL,
  GOAL_CHANGE_HINT,
  GOAL_CHANGE_HINT_CLASS,
  GOAL_OPTIONS,
  GOAL_SECTION_LABEL,
  GOAL_SECTION_LABEL_CLASS,
  type PrimaryGoal,
} from '../../lib/goals'
import { loadPrimaryGoal, savePrimaryGoal } from '../../lib/storage'
import { dismissMobileKeyboardAndZoom } from '../../lib/mobileFormFocus'

const resetConfirmClass =
  'lifexp-pressable-3d rounded-xl border-2 border-red-500 bg-gradient-to-b from-red-500 to-red-700 px-4 py-2.5 text-sm font-bold text-white hover:border-red-600 hover:from-red-600 hover:to-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:border-red-700 dark:from-red-700 dark:to-red-950'

const resetTriggerClass =
  'lifexp-pressable-3d w-full rounded-xl border-2 border-red-300 bg-gradient-to-b from-red-50 to-red-100 py-3.5 text-sm font-bold text-red-800 hover:border-red-400 hover:from-red-100 hover:to-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:border-red-900/70 dark:from-red-950/60 dark:to-red-950 dark:text-red-200 dark:hover:border-red-800'

const compactActionButtonClass = `${PILL_BACK_CLASS} px-3 py-2 text-xs`

export default function ZielePage() {
  const router = useRouter()
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>(DEFAULT_PRIMARY_GOAL)
  const [goalText, setGoalText] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmUserReset, setConfirmUserReset] = useState(false)
  const [resetError, setResetError] = useState('')
  const [userResetError, setUserResetError] = useState('')
  const [danSessionActive, setDanSessionActive] = useState(false)
  const [showDanDevLogin, setShowDanDevLogin] = useState(false)
  const [danSessionBusy, setDanSessionBusy] = useState(false)
  const [danSessionError, setDanSessionError] = useState('')
  const [showZielvorgabenHint, setShowZielvorgabenHint] = useState(false)
  const zieleToolsRef = useRef<HTMLElement>(null)
  const goalTextSaveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lokale Fallback-Auswahl liegt im Browser-Speicher
    setDanSessionActive(isDanProfileOverrideActive())
    setShowDanDevLogin(canShowDanProfileDevLogin())
    setPrimaryGoal(loadPrimaryGoal())
    void (async () => {
      const { settings, error } = await fetchCurrentProfile()
      if (cancelled || error) return
      setPrimaryGoal(settings.goalType)
      setGoalText(settings.goalText)
      if (shouldPersistLocalProfilePrefs()) {
        savePrimaryGoal(settings.goalType)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const syncZielvorgabenHint = async () => {
      const { complete } = await fetchZielvorgabenComplete()
      setShowZielvorgabenHint(!complete)
    }

    void syncZielvorgabenHint()
    window.addEventListener('focus', syncZielvorgabenHint)
    document.addEventListener('visibilitychange', syncZielvorgabenHint)
    return () => {
      window.removeEventListener('focus', syncZielvorgabenHint)
      document.removeEventListener('visibilitychange', syncZielvorgabenHint)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (goalTextSaveTimerRef.current !== null) {
        window.clearTimeout(goalTextSaveTimerRef.current)
      }
    }
  }, [])

  const persistGoalTextNow = useCallback((text: string) => {
    void updateCurrentProfileGoalText(text)
  }, [])

  const handleGoalTextChange = useCallback(
    (text: string) => {
      setGoalText(text)
      if (goalTextSaveTimerRef.current !== null) {
        window.clearTimeout(goalTextSaveTimerRef.current)
      }
      goalTextSaveTimerRef.current = window.setTimeout(() => {
        persistGoalTextNow(text)
        goalTextSaveTimerRef.current = null
      }, 400)
    },
    [persistGoalTextNow],
  )

  const commitGoalText = useCallback(
    (text: string) => {
      if (goalTextSaveTimerRef.current !== null) {
        window.clearTimeout(goalTextSaveTimerRef.current)
        goalTextSaveTimerRef.current = null
      }
      persistGoalTextNow(text)
      dismissMobileKeyboardAndZoom()
      window.setTimeout(() => {
        zieleToolsRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      }, 80)
    },
    [persistGoalTextNow],
  )

  const selectPrimaryGoal = (goal: PrimaryGoal) => {
    setPrimaryGoal(goal)
    if (shouldPersistLocalProfilePrefs()) {
      savePrimaryGoal(goal)
    }
    void updateCurrentProfileGoal(goal)
  }

  const toggleDanSession = async () => {
    setDanSessionError('')
    setDanSessionBusy(true)
    try {
      if (danSessionActive) {
        logoutDanProfile()
        setDanSessionActive(false)
        setShowDanDevLogin(canShowDanProfileDevLogin())
        setPrimaryGoal(loadPrimaryGoal())
        router.replace('/')
        return
      }

      const { error } = await loginAsDanProfile()
      if (error) {
        setDanSessionError(error.message)
        return
      }

      const { settings, error: profileError } = await fetchCurrentProfile()
      if (profileError) {
        setDanSessionError(profileError.message)
        logoutDanProfile()
        return
      }

      setDanSessionActive(true)
      setShowDanDevLogin(true)
      setPrimaryGoal(settings.goalType)
      setGoalText(settings.goalText)
      router.replace('/')
    } finally {
      setDanSessionBusy(false)
    }
  }

  const resetConfirmed = async () => {
    const { error } = await resetAllXpProgressData()
    if (error) {
      setResetError(error.message)
      return
    }
    clearLocalXpAndKnowledgeState()
    setResetError('')
    setConfirmReset(false)
  }

  const userResetConfirmed = async () => {
    const { error } = await resetAllUserAccountData()
    if (error) {
      setUserResetError(error.message)
      return
    }
    setUserResetError('')
    setConfirmUserReset(false)
    router.replace('/')
  }

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/" className={PILL_BACK_CLASS}>
            <span aria-hidden>←</span>
            Zurück
          </Link>
          <ThemeToggle />
        </div>

        <h1 className="text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
          deine Ziele
        </h1>

        <section
          className="mt-4 rounded-2xl border-2 border-emerald-300/90 bg-emerald-50/40 p-3 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.1)] dark:border-emerald-700/80 dark:bg-emerald-950/20"
          aria-labelledby="ziele-hauptziel"
        >
          <h2 id="ziele-hauptziel" className={GOAL_SECTION_LABEL_CLASS}>
            {GOAL_SECTION_LABEL}
          </h2>
          <div className="mt-2 flex flex-col gap-1.5" role="group" aria-label="Hauptziel wählen">
            {GOAL_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => selectPrimaryGoal(option.value)}
                className={`lifexp-pressable-3d w-full rounded-xl border-2 px-3 py-2 text-sm font-bold leading-snug focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                  primaryGoal === option.value
                    ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 text-slate-900 ring-1 ring-emerald-200/80 dark:border-emerald-400 dark:from-emerald-950/55 dark:to-teal-950/45 dark:text-slate-100 dark:ring-emerald-700/45'
                    : 'border-stone-400/90 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/70 text-slate-800 ring-1 ring-stone-500/18 hover:border-stone-500 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-slate-200 dark:ring-stone-600/30 dark:hover:border-slate-400'
                }`}
              >
                <GoalOptionLabel option={option} layout="flanked" />
              </button>
            ))}
          </div>
          {primaryGoal === 'goal' ? (
            <GoalTextInput
              value={goalText}
              onChange={handleGoalTextChange}
              onCommit={commitGoalText}
              autoFocus
            />
          ) : null}
          <p className={`mt-2 ${GOAL_CHANGE_HINT_CLASS}`}>{GOAL_CHANGE_HINT}</p>
        </section>

        <section ref={zieleToolsRef} className="mt-8 flex flex-col gap-3 scroll-mt-6" aria-labelledby="ziele-tools">
          <h2 id="ziele-tools" className="sr-only">
            Einstellungen
          </h2>
          <DashboardButton
            href="/ziele/personliche-einstellungen"
            emoji="⚙️"
            title="Persönliche Einstellungen"
            subtitle="Profil, Benachrichtigungen, Anzeige"
          />
          <div>
            {showZielvorgabenHint ? <FlowHintArrow /> : null}
            <DashboardButton
              href="/ziele/zielvorgaben"
              emoji="🎯"
              title="Zielvorgaben"
              subtitle="Alkohol, Motivation und mehr"
              status={showZielvorgabenHint ? 'pending' : undefined}
            />
          </div>
        </section>

        <section className="mt-auto flex flex-col gap-3 pt-8" aria-label="Gefährliche Aktionen">
          {confirmUserReset ? (
            <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-center shadow-[0_4px_16px_-4px_rgba(127,29,29,0.18)] dark:border-red-900/70 dark:bg-red-950/45">
              <p className="text-sm font-bold text-red-950 dark:text-red-100">
                Benutzer unwiderruflich löschen?
              </p>
              <p className="mt-2 text-xs leading-relaxed text-red-800 dark:text-red-200">
                Profil, gesamte Historie, Aufgaben, Wochenplan, individuelle Lebensmittel und lokaler
                Speicher werden entfernt. Du startest danach neu im Onboarding.
              </p>
              {userResetError ? (
                <p className="mt-2 text-xs text-red-700 dark:text-red-300" role="alert">
                  {userResetError}
                </p>
              ) : null}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmUserReset(false)
                    setUserResetError('')
                  }}
                  className="lifexp-pressable-3d rounded-xl border-2 border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 px-4 py-2.5 text-sm font-semibold text-stone-800 hover:border-stone-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-stone-100 dark:hover:border-stone-500"
                >
                  Nein
                </button>
                <button type="button" onClick={() => void userResetConfirmed()} className={resetConfirmClass}>
                  Ja
                </button>
              </div>
            </div>
          ) : confirmReset ? (
            <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-center shadow-[0_4px_16px_-4px_rgba(127,29,29,0.18)] dark:border-red-900/70 dark:bg-red-950/45">
              <p className="text-sm font-bold text-red-950 dark:text-red-100">
                Willst du wirklich komplett neu anfangen?
              </p>
              <p className="mt-2 text-xs leading-relaxed text-red-800 dark:text-red-200">
                XP-Historie (alle Bereiche), erfasste Mahlzeiten und Tages-Protokoll, Fragen-Status
                (Wissen) und Profil-Stand (XP, Level, Streak) werden zurückgesetzt. Aufgaben,
                Wochenplan und individuelle Lebensmittel bleiben erhalten. Die Historie beginnt ab
                heute neu.
              </p>
              {resetError ? (
                <p className="mt-2 text-xs text-red-700 dark:text-red-300" role="alert">
                  {resetError}
                </p>
              ) : null}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="lifexp-pressable-3d rounded-xl border-2 border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 px-4 py-2.5 text-sm font-semibold text-stone-800 hover:border-stone-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-stone-100 dark:hover:border-stone-500"
                >
                  Nein
                </button>
                <button type="button" onClick={() => void resetConfirmed()} className={resetConfirmClass}>
                  Ja
                </button>
              </div>
            </div>
          ) : (
            <>
              <button type="button" onClick={() => setConfirmReset(true)} className={resetTriggerClass}>
                Alle XP zurücksetzen
              </button>
              <button type="button" onClick={() => setConfirmUserReset(true)} className={resetTriggerClass}>
                Benutzer löschen
              </button>
              {showDanDevLogin ? (
                <div className="flex flex-col items-start gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleDanSession()}
                    disabled={danSessionBusy}
                    className={`${compactActionButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {danSessionBusy
                      ? 'Wird geladen …'
                      : danSessionActive
                        ? 'Dan ausloggen'
                        : 'Dan einloggen'}
                  </button>
                  {danSessionError ? (
                    <p className="text-xs text-red-700 dark:text-red-300" role="alert">
                      {danSessionError}
                    </p>
                  ) : danSessionActive ? (
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                      Aktiv: Profil „dan“ aus Supabase. Dein Benutzer in diesem Browser bleibt gespeichert.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </section>
        <div
          className="min-h-[max(5rem,calc(3rem+env(safe-area-inset-bottom)))] shrink-0"
          aria-hidden
        />
      </div>
    </main>
  )
}
