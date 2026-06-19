'use client'

import { type PointerEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import HomeScreen from './HomeScreen'
import PwaInstallPanel from './PwaInstallPanel'
import RecoveryCodePanel from './RecoveryCodePanel'
import ThemeToggle from './ThemeToggle'
import {
  AVATAR_GENDER_LABELS,
  AVATAR_FRAME_INTRO_MAX_PX,
  AVATAR_TOGETHER_SRC,
  avatarGenderForIntroSrc,
  getAvatarImagePath,
  ONBOARDING_INTRO_AVATAR_SEQUENCE,
  type AvatarGender,
} from '../lib/avatarLibrary'
import { preloadAvatarImage, saveAvatarDisplayCache } from '../lib/avatarDisplayCache'
import {
  INTRO_HOLD_MS,
  introSlideHoldMs,
  PRE_ONBOARDING_WELCOME_HEADLINE,
  PRE_ONBOARDING_WELCOME_SUBLINE,
  PRE_ONBOARDING_WELCOME_FREE_LINE,
  preOnboardingTapHintCounter,
  secondsUntilIntroSheet,
} from '../lib/onboardingIntro'
import { createGuestProfile, fetchCurrentProfile, fetchProfileByRecoveryCode, isUsernameAvailable, updateCurrentProfileRecCodeOk } from '../lib/profile'
import GoalOptionLabel from './GoalOptionLabel'
import {
  DEFAULT_PRIMARY_GOAL,
  GOAL_CHANGE_HINT,
  GOAL_CHANGE_HINT_CLASS,
  GOAL_OPTIONS,
  type PrimaryGoal,
} from '../lib/goals'
import { displayNameConflictInputProps, displayNameInputProps, integerInputProps } from '../lib/formInputAutofill'
import {
  focusInputElement,
  scrollInputIntoComfortableView,
  useAutoFocusInput,
} from '../lib/useAutoFocusInput'
import { initSignupDate, savePrimaryGoal } from '../lib/storage'
import {
  isIosDevice,
  isPwaInstallDetected,
  isStandaloneDisplayMode,
  recordPwaInstallSuccess,
  savePwaInstallLater,
} from '../lib/pwaInstall'
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
  type OnboardingDraft,
} from '../lib/onboardingDraft'
import { useVisualViewportLayout } from '../lib/useVisualViewportLayout'
import { applyAppIcons } from '../lib/appIcon'
import { ONBOARDING_BACKDROP_CLASS } from '../lib/appShell'
import { bootstrapClientStorageFromCookies } from '../lib/clientStorageBootstrap'
import { fetchNutritionRule } from '../lib/nutrition'
import { nutritionProfileLookupFromInputs } from '../lib/typeCategory'
import { clearStoredUsername, markSessionEstablished, setStoredUsername } from '../lib/user'
import { applyProfileToLocalSession } from '../lib/recoverySession'
import {
  isValidRecoveryCodeFormat,
  normalizeRecoveryCodeInput,
  RECOVERY_RESTORE_MAX_ATTEMPTS,
} from '../lib/recoveryCode'

const INTRO_SHEET_FADE_MS = 0

const INPUT_STEPS = new Set<OnboardingStepId>(['username', 'age', 'heightCm', 'weightKg'])

type GenderOption = 'male' | 'female' | 'divers'

type OnboardingStepId =
  | 'username'
  | 'age'
  | 'gender'
  | 'avatarGender'
  | 'heightCm'
  | 'weightKg'
  | 'goalType'
  | 'homeScreenInstall'
  | 'start'
  | 'recoveryCode'

const STEPS: OnboardingStepId[] = [
  'username',
  'age',
  'gender',
  'avatarGender',
  'heightCm',
  'weightKg',
  'homeScreenInstall',
  'goalType',
  'start',
  'recoveryCode',
]

/** Schritt-Indizes vor Install↔Ziel-Tausch (Draft-Migration). */
const LEGACY_GOAL_STEP_INDEX = 6
const LEGACY_INSTALL_STEP_INDEX = 7

function migrateDraftStepIndex(stepIndex: number): number {
  if (stepIndex === LEGACY_GOAL_STEP_INDEX) return STEPS.indexOf('goalType')
  if (stepIndex === LEGACY_INSTALL_STEP_INDEX) return STEPS.indexOf('homeScreenInstall')
  return Math.min(Math.max(0, stepIndex), STEPS.length - 1)
}

const GENDER_OPTIONS: { value: GenderOption; label: string }[] = [
  { value: 'male', label: 'Männlich' },
  { value: 'female', label: 'Weiblich' },
  { value: 'divers', label: 'Divers' },
]

const AVATAR_GENDER_OPTIONS: { value: AvatarGender; label: string }[] = [
  { value: 'male', label: AVATAR_GENDER_LABELS.male },
  { value: 'female', label: AVATAR_GENDER_LABELS.female },
]

const STEP_TITLES: Record<OnboardingStepId, string> = {
  username: 'Wie heißt du?',
  age: 'Alter',
  gender: 'Geschlecht',
  avatarGender: 'Anzeige Avatar',
  heightCm: 'Körpergröße',
  weightKg: 'Gewicht',
  goalType: 'Hauptziel',
  homeScreenInstall: 'LifeXP zum Home-Bildschirm zufügen?',
  start: 'Bereit für LifeXP?',
  recoveryCode: 'Dein Recovery-Code',
}

const STEP_HINTS: Partial<Record<OnboardingStepId, string>> = {
  username: 'Dein Name in LifeXP',
  age: 'Alter in Jahren',
  heightCm: 'Größe in cm',
  weightKg: 'Gewicht in kg',
}

const INPUT_PLACEHOLDERS: Partial<Record<OnboardingStepId, string>> = {
  username: 'z. B. Alex',
  age: 'Jahre',
  heightCm: '175',
  weightKg: '75',
}

const inputCardClass =
  'mt-3 w-full rounded-2xl border-2 border-emerald-400/80 bg-white shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200/70 dark:border-emerald-600 dark:bg-slate-900 dark:focus-within:ring-emerald-800/40'

const textInputClass =
  'w-full border-0 bg-transparent px-3 pb-3 pt-0.5 text-2xl font-bold leading-tight text-slate-900 caret-emerald-600 outline-none placeholder:text-slate-300 dark:text-slate-100 dark:placeholder:text-slate-600'

const numericInputClass =
  'w-full border-0 bg-transparent px-3 pb-3 pt-2 text-center text-3xl font-bold tabular-nums leading-tight text-slate-900 caret-emerald-600 outline-none placeholder:text-slate-300 dark:text-slate-100 dark:placeholder:text-slate-600'

function formatUsernameInput(raw: string): string {
  const cleaned = raw.replace(/[^\p{L}\p{N}\s'-]/gu, '')
  if (!cleaned) return ''
  return (cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()).slice(0, 40)
}

const choiceButtonClass = (selected: boolean) =>
  `lifexp-pressable-3d min-h-[3.25rem] rounded-2xl border-2 px-3 py-3.5 text-center text-sm font-bold leading-snug sm:min-h-[3.5rem] sm:py-4 sm:text-base ${
    selected
      ? 'border-emerald-500 bg-gradient-to-b from-emerald-50 via-emerald-100/90 to-teal-200/70 text-slate-900 dark:border-emerald-400 dark:from-emerald-900/65 dark:via-emerald-950/50 dark:to-teal-950 dark:text-slate-100'
      : 'border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 text-slate-800 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-slate-200'
  }`

const goalButtonClass = (selected: boolean) =>
  `lifexp-pressable-3d min-h-[3.75rem] w-full rounded-2xl border-2 px-4 py-4 text-center text-lg font-bold leading-snug sm:text-xl ${
    selected
      ? 'border-emerald-500 bg-gradient-to-b from-emerald-50 via-emerald-100/90 to-teal-200/70 text-slate-900 dark:border-emerald-400 dark:from-emerald-900/65 dark:via-emerald-950/50 dark:to-teal-950 dark:text-slate-100'
      : 'border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 text-slate-800 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-slate-200'
  }`

const onboardingSheetClass =
  'lifexp-onboarding-sheet absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-[1.75rem] border-t-2 border-slate-300/90 bg-gradient-to-b from-slate-100 via-slate-200/95 to-slate-300/80 shadow-[0_-12px_40px_-8px_rgba(15,23,42,0.22)] dark:border-slate-600 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950/90'

const onboardingSheetFooterClass =
  'relative z-20 shrink-0 border-t border-slate-300/90 bg-gradient-to-b from-slate-100 via-slate-200/95 to-slate-300/80 pt-3 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950/95'

const onboardingReadonlyValueClass =
  'min-w-[4rem] shrink-0 rounded-lg border-2 border-emerald-400/85 bg-white px-2.5 py-1.5 text-center text-xl font-bold tabular-nums leading-none text-slate-900 shadow-sm dark:border-emerald-600 dark:bg-slate-900 dark:text-slate-100'

function OnboardingNutritionOptRow({
  label,
  operator,
  value,
  unit,
}: {
  label: string
  operator: '≤' | '>'
  value: number
  unit: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300"
          aria-hidden
        >
          {operator}
        </span>
        <output className={onboardingReadonlyValueClass} aria-label={`${value} ${unit}`}>
          {value}
        </output>
        <span className="text-base font-semibold text-slate-600 dark:text-slate-300">{unit}</span>
      </div>
    </div>
  )
}

type OnboardingFlowProps = {
  onComplete: () => void
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [hasStarted, setHasStarted] = useState(false)
  const [introSheetVisible, setIntroSheetVisible] = useState(false)
  const [introReady, setIntroReady] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  const [previewAvatarGender, setPreviewAvatarGender] = useState<AvatarGender>('male')
  const [introAvatarSrc, setIntroAvatarSrc] = useState(AVATAR_TOGETHER_SRC)
  const [introAvatarEpoch, setIntroAvatarEpoch] = useState(0)
  const [username, setUsername] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<GenderOption | null>(null)
  const [avatarGender, setAvatarGender] = useState<AvatarGender | null>(null)
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [goalType, setGoalType] = useState<PrimaryGoal>(DEFAULT_PRIMARY_GOAL)

  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const stepInputRef = useRef<HTMLInputElement>(null)
  const introStartedAtRef = useRef(0)
  const preOnboardingPointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const [preOnboardingTapHint, setPreOnboardingTapHint] = useState(false)
  const [preOnboardingTapSeconds, setPreOnboardingTapSeconds] = useState(0)
  const [pwaInstallDetected, setPwaInstallDetected] = useState(false)
  const [usernameConflict, setUsernameConflict] = useState(false)
  const [usernameValidated, setUsernameValidated] = useState(false)
  const [conflictNameInputLocked, setConflictNameInputLocked] = useState(false)
  const [onboardingPwaInstallAcknowledged, setOnboardingPwaInstallAcknowledged] = useState(false)
  const [showOpenPwaHint, setShowOpenPwaHint] = useState(false)
  const [createdRecoveryCode, setCreatedRecoveryCode] = useState('')
  const [usernameRestoreOpen, setUsernameRestoreOpen] = useState(false)
  const [restoreCodeInput, setRestoreCodeInput] = useState('')
  const [restoreAttempts, setRestoreAttempts] = useState(0)
  const [restoreLocked, setRestoreLocked] = useState(false)
  const [nutritionOptPreview, setNutritionOptPreview] = useState<{
    kcalOpt: number | null
    protOpt: number | null
    loading: boolean
  }>({ kcalOpt: null, protOpt: null, loading: false })
  const conflictShellFocusedRef = useRef(false)
  const draftHydratedRef = useRef(false)
  const standaloneInstallResumeRef = useRef(false)
  const viewport = useVisualViewportLayout()

  const stepId = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1
  const isInstallStep = stepId === 'homeScreenInstall'
  const isStartStep = stepId === 'start'
  const isRecoveryStep = stepId === 'recoveryCode'
  const isUsernameStep = stepId === 'username'
  const usernameRestoreActive = hasStarted && isUsernameStep && usernameRestoreOpen
  const isInputStep = INPUT_STEPS.has(stepId)
  const isIntroScreen = !hasStarted
  const isNameStep = hasStarted && stepId === 'username'
  const showNameInputShell = hasStarted && usernameConflict
  const installActionsEnabled = usernameValidated || isStandaloneDisplayMode()
  const showNumericShell = hasStarted && (stepId === 'age' || stepId === 'heightCm' || stepId === 'weightKg')

  useAutoFocusInput(
    stepInputRef,
    hasStarted && isInputStep && !showNameInputShell,
    `${stepId}-${stepIndex}`,
  )

  useEffect(() => {
    if (!isRecoveryStep || createdRecoveryCode) return
    let cancelled = false
    void (async () => {
      const { settings } = await fetchCurrentProfile()
      if (cancelled || !settings.recCode) return
      setCreatedRecoveryCode(settings.recCode)
    })()
    return () => {
      cancelled = true
    }
  }, [isRecoveryStep, createdRecoveryCode])

  useEffect(() => {
    if (!isStartStep || !gender) {
      setNutritionOptPreview({ kcalOpt: null, protOpt: null, loading: false })
      return
    }

    const weight = parseInt(weightKg, 10)
    if (!Number.isFinite(weight) || weight <= 0) {
      setNutritionOptPreview({ kcalOpt: null, protOpt: null, loading: false })
      return
    }

    let cancelled = false
    setNutritionOptPreview({ kcalOpt: null, protOpt: null, loading: true })

    void (async () => {
      const lookup = nutritionProfileLookupFromInputs({ gender, goalType, weightKg: weight })
      const { rule, error } = await fetchNutritionRule(lookup)
      if (cancelled) return
      if (error || !rule) {
        setNutritionOptPreview({ kcalOpt: null, protOpt: null, loading: false })
        return
      }
      setNutritionOptPreview({
        kcalOpt: rule.kcalOpt,
        protOpt: rule.protOpt,
        loading: false,
      })
    })()

    return () => {
      cancelled = true
    }
  }, [isStartStep, gender, goalType, weightKg])

  const applyDraftSnapshot = useCallback((draft: OnboardingDraft) => {
    setUsername(draft.username)
    setAge(draft.age)
    setGender(draft.gender)
    setAvatarGender(draft.avatarGender)
    if (draft.avatarGender) setPreviewAvatarGender(draft.avatarGender)
    setHeightCm(draft.heightCm)
    setWeightKg(draft.weightKg)
    setGoalType(draft.goalType)
    const installStepIndex = STEPS.indexOf('homeScreenInstall')
    let restoredStepIndex = migrateDraftStepIndex(draft.stepIndex)
    if (restoredStepIndex >= installStepIndex && !draft.usernameValidated) {
      restoredStepIndex = STEPS.indexOf('weightKg')
    }
    setStepIndex((current) => Math.max(current, restoredStepIndex))
    setHasStarted(true)
    setIntroSheetVisible(true)
    setIntroReady(true)
    setOnboardingPwaInstallAcknowledged(draft.onboardingPwaInstallAcknowledged)
    setUsernameValidated(draft.usernameValidated)
  }, [])

  useEffect(() => {
    if (draftHydratedRef.current) return
    draftHydratedRef.current = true
    bootstrapClientStorageFromCookies()
    const draft = loadOnboardingDraft()
    if (!draft?.hasStarted) return
    applyDraftSnapshot(draft)
  }, [applyDraftSnapshot])

  useEffect(() => {
    if (!hasStarted) return

    const resyncDraftFromStorage = () => {
      if (document.visibilityState !== 'visible') return
      bootstrapClientStorageFromCookies()
      const draft = loadOnboardingDraft()
      if (!draft?.hasStarted) return
      applyDraftSnapshot(draft)
    }

    window.addEventListener('focus', resyncDraftFromStorage)
    window.addEventListener('pageshow', resyncDraftFromStorage)
    document.addEventListener('visibilitychange', resyncDraftFromStorage)
    return () => {
      window.removeEventListener('focus', resyncDraftFromStorage)
      window.removeEventListener('pageshow', resyncDraftFromStorage)
      document.removeEventListener('visibilitychange', resyncDraftFromStorage)
    }
  }, [hasStarted, applyDraftSnapshot])

  useEffect(() => {
    if (standaloneInstallResumeRef.current) return
    if (!hasStarted || stepId !== 'homeScreenInstall' || !usernameValidated) return
    if (!isStandaloneDisplayMode()) return

    standaloneInstallResumeRef.current = true
    setShowOpenPwaHint(false)
    setOnboardingPwaInstallAcknowledged(true)
    setStepIndex(STEPS.indexOf('goalType'))
  }, [hasStarted, stepId, usernameValidated])

  const buildOnboardingDraft = useCallback((): OnboardingDraft => {
    return {
      version: 1,
      incomplete: true,
      hasStarted,
      stepIndex,
      username,
      age,
      gender,
      avatarGender,
      heightCm,
      weightKg,
      goalType,
      onboardingPwaInstallAcknowledged,
      usernameValidated,
    }
  }, [
    hasStarted,
    stepIndex,
    username,
    age,
    gender,
    avatarGender,
    heightCm,
    weightKg,
    goalType,
    onboardingPwaInstallAcknowledged,
    usernameValidated,
  ])

  useEffect(() => {
    if (!hasStarted) return
    saveOnboardingDraft(buildOnboardingDraft())
  }, [hasStarted, buildOnboardingDraft])

  useEffect(() => {
    if (!showNameInputShell) {
      setConflictNameInputLocked(false)
      conflictShellFocusedRef.current = false
      return
    }

    if (conflictShellFocusedRef.current) return

    setConflictNameInputLocked(true)
    const unlockAndFocus = () => {
      const el = stepInputRef.current
      if (!el) return
      setConflictNameInputLocked(false)
      focusInputElement(el)
    }

    conflictShellFocusedRef.current = true
    const el = stepInputRef.current
    if (el) focusInputElement(el)

    const timers = [80, 200, 400].map((ms) => window.setTimeout(unlockAndFocus, ms))
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [showNameInputShell])

  useEffect(() => {
    if (!isInstallStep) return
    const sync = () => setPwaInstallDetected(isPwaInstallDetected())
    sync()
    window.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)
    window.addEventListener('pageshow', sync)
    return () => {
      window.removeEventListener('visibilitychange', sync)
      window.removeEventListener('focus', sync)
      window.removeEventListener('pageshow', sync)
    }
  }, [isInstallStep, stepIndex])

  useEffect(() => {
    if (!isInstallStep || !avatarGender) return
    applyAppIcons(avatarGender)
  }, [isInstallStep, avatarGender])

  // Onboarding: nach 15 s (1× Sequenz) direkt Sheet sichtbar, keine Extra-Wartezeit.
  useEffect(() => {
    // Wird im Slideshow-Effect gesteuert.
    return () => {}
  }, [])

  useEffect(() => {
    if (introSheetVisible || hasStarted) return

    const sequence = ONBOARDING_INTRO_AVATAR_SEQUENCE.map((src) => ({
      src,
      gender: avatarGenderForIntroSrc(src),
    }))

    let cancelled = false
    let timer: number | undefined

    const showSlide = (index: number) => {
      const slide = sequence[index]!
      setIntroAvatarSrc(slide.src)
      setPreviewAvatarGender(slide.gender)
      setIntroAvatarEpoch((n) => n + 1)
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const preloadSlide = (index: number) => {
      const src = sequence[index]?.src
      if (src) void preloadAvatarImage(src)
    }

    const runSequenceOnce = () => {
      const slideCount = sequence.length
      if (slideCount === 0) {
        setIntroSheetVisible(true)
        setIntroReady(true)
        return
      }

      showSlide(0)
      preloadSlide(1)

      if (prefersReducedMotion) {
        timer = window.setTimeout(() => {
          if (cancelled) return
          setIntroSheetVisible(true)
          setIntroReady(true)
        }, INTRO_HOLD_MS)
        return
      }

      const scheduleAfterSlide = (currentIndex: number) => {
        const holdMs = introSlideHoldMs(currentIndex, slideCount)
        timer = window.setTimeout(() => {
          if (cancelled) return
          const nextIndex = currentIndex + 1
          if (nextIndex >= slideCount) {
            setIntroSheetVisible(true)
            setIntroReady(true)
            return
          }
          showSlide(nextIndex)
          preloadSlide(nextIndex + 1)
          scheduleAfterSlide(nextIndex)
        }, holdMs)
      }

      scheduleAfterSlide(0)
    }

    runSequenceOnce()

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [introSheetVisible, hasStarted])

  const avatarPanelHeight = Math.min(
    typeof window !== 'undefined' ? window.innerHeight * 0.4 : 320,
    Math.max(140, viewport.offsetTop + viewport.height * 0.34),
  )

  const keyboardInset = viewport.keyboardOpen ? viewport.keyboardHeight : 0

  // Viewport-Höhe berücksichtigt die Tastatur bereits – kein extra keyboardInset am Sheet
  const sheetAvatarHeight =
    isNameStep && viewport.keyboardOpen ? 0 : avatarPanelHeight
  const sheetMaxHeight = Math.max(
    200,
    (viewport.height > 0 ? viewport.height : 600) - sheetAvatarHeight,
  )
  const sheetPaddingBottom = 'max(0.75rem, env(safe-area-inset-bottom))'

  const advanceToNextStep = useCallback(() => {
    setErrorMessage('')
    setStepIndex((i) => i + 1)
  }, [])

  const startQuestions = () => {
    setHasStarted(true)
    setErrorMessage('')
  }

  const validateCurrentStep = (): boolean => {
    setErrorMessage('')
    switch (stepId) {
      case 'username': {
        const formatted = formatUsernameInput(username)
        if (formatted !== username) setUsername(formatted)
        if (!formatted.trim()) {
          setErrorMessage('Bitte einen Namen eingeben.')
          return false
        }
        if (!/[\p{L}\p{N}]/u.test(formatted)) {
          setErrorMessage('Bitte Buchstaben oder Zahlen verwenden.')
          return false
        }
        return true
      }
      case 'age': {
        const ageNum = parseInt(age, 10)
        if (!Number.isFinite(ageNum) || ageNum < 10 || ageNum > 120) {
          setErrorMessage('Bitte ein gültiges Alter (10–120) eingeben.')
          return false
        }
        return true
      }
      case 'gender':
        if (!gender) {
          setErrorMessage('Bitte ein Geschlecht wählen.')
          return false
        }
        return true
      case 'avatarGender':
        if (!avatarGender) {
          setErrorMessage('Bitte eine Avatar-Anzeige wählen.')
          return false
        }
        return true
      case 'heightCm': {
        const heightNum = parseInt(heightCm, 10)
        if (!Number.isFinite(heightNum) || heightNum < 100 || heightNum > 250) {
          setErrorMessage('Bitte eine gültige Körpergröße in cm (100–250) eingeben.')
          return false
        }
        return true
      }
      case 'weightKg': {
        const weightNum = parseInt(weightKg, 10)
        if (!Number.isFinite(weightNum) || weightNum < 30 || weightNum > 300) {
          setErrorMessage('Bitte ein gültiges Gewicht in kg (30–300) eingeben.')
          return false
        }
        return true
      }
      case 'goalType':
        return true
      case 'homeScreenInstall':
      case 'start':
        return true
      default:
        return true
    }
  }

  const verifyUsernameAvailability = async (name: string): Promise<boolean> => {
    const trimmedName = formatUsernameInput(name).trim()
    if (!trimmedName || !/[\p{L}\p{N}]/u.test(trimmedName)) {
      setErrorMessage('Bitte einen gültigen Namen eingeben.')
      return false
    }

    setErrorMessage('')
    setSubmitting(true)
    try {
      const available = await isUsernameAvailable(trimmedName)
      if (!available) {
        setUsername(formatUsernameInput(name))
        setUsernameConflict(true)
        setUsernameValidated(false)
        setErrorMessage('Dieser Benutzername ist bereits vergeben.')
        stepInputRef.current?.blur()
        return false
      }
      setUsernameConflict(false)
      setUsernameValidated(true)
      if (avatarGender) {
        saveAvatarDisplayCache({
          src: getAvatarImagePath(1, avatarGender),
          avatarGender,
        })
        applyAppIcons(avatarGender)
      }
      return true
    } finally {
      setSubmitting(false)
    }
  }

  const verifyUsernameAfterWeightAndAdvance = async (): Promise<void> => {
    if (!validateCurrentStep()) return
    if (!(await verifyUsernameAvailability(username))) return
    advanceToNextStep()
  }

  const handleConflictContinue = async () => {
    if (!conflictNameReady) return
    if (!(await verifyUsernameAvailability(username))) return
    if (isStartStep) {
      void createProfileAndAdvance()
      return
    }
    if (isLastStep) {
      void finishRecoveryStep()
      return
    }
    advanceToNextStep()
  }

  const persistOnboardingProfile = async (): Promise<boolean> => {
    const trimmedName = formatUsernameInput(username).trim()
    const ageNum = parseInt(age, 10)
    const heightNum = parseInt(heightCm, 10)
    const weightNum = parseInt(weightKg, 10)
    if (!gender || !avatarGender) return false

    setErrorMessage('')
    setUsernameConflict(false)
    const { error, usernameTaken, recoveryCode } = await createGuestProfile({
      username: trimmedName,
      age: ageNum,
      gender,
      avatarGender,
      heightCm: heightNum,
      weightKg: weightNum,
      goalType,
    })
    if (error) {
      setErrorMessage(error.message)
      setUsernameConflict(Boolean(usernameTaken))
      if (usernameTaken) stepInputRef.current?.blur()
      return false
    }
    if (recoveryCode) setCreatedRecoveryCode(recoveryCode)
    setStoredUsername(trimmedName)
    markSessionEstablished()
    saveAvatarDisplayCache({
      src: getAvatarImagePath(1, avatarGender),
      avatarGender,
    })
    savePrimaryGoal(goalType)
    initSignupDate()
    return true
  }

  const createProfileAndAdvance = async () => {
    if (!validateCurrentStep()) return
    setSubmitting(true)
    try {
      if (!(await persistOnboardingProfile())) return
      if (onboardingPwaInstallAcknowledged || isStandaloneDisplayMode() || pwaInstallDetected) {
        await recordPwaInstallSuccess()
      }
      advanceToNextStep()
    } finally {
      setSubmitting(false)
    }
  }

  const finishRecoveryStep = async () => {
    setSubmitting(true)
    try {
      const { error } = await updateCurrentProfileRecCodeOk(true)
      if (error) {
        setErrorMessage(error.message)
        return
      }
      clearOnboardingDraft()
      onComplete()
    } finally {
      setSubmitting(false)
    }
  }

  const registerRestoreFailure = (message: string) => {
    const nextAttempt = restoreAttempts + 1
    setRestoreAttempts(nextAttempt)
    if (nextAttempt >= RECOVERY_RESTORE_MAX_ATTEMPTS) {
      setRestoreLocked(true)
      setErrorMessage(
        'Zu viele Fehlversuche. Recovery-Code-Eingabe ist vorübergehend gesperrt.',
      )
      return
    }
    const remaining = RECOVERY_RESTORE_MAX_ATTEMPTS - nextAttempt
    setErrorMessage(
      `${message} Noch ${remaining} ${remaining === 1 ? 'Versuch' : 'Versuche'}.`,
    )
  }

  const handleRestoreAccount = async () => {
    if (restoreLocked) return
    setErrorMessage('')
    setSubmitting(true)
    try {
      const normalized = normalizeRecoveryCodeInput(restoreCodeInput)
      if (!isValidRecoveryCodeFormat(normalized)) {
        registerRestoreFailure(
          'Bitte einen gültigen Recovery-Code eingeben (z. B. LIFE-7K3P-92XQ).',
        )
        return
      }
      const { settings, error } = await fetchProfileByRecoveryCode(normalized)
      if (error) {
        registerRestoreFailure(error.message)
        return
      }
      if (!settings.username) {
        registerRestoreFailure(
          'Recovery-Code nicht gefunden. Bitte prüfen und erneut versuchen.',
        )
        return
      }
      applyProfileToLocalSession(settings)
      onComplete()
    } finally {
      setSubmitting(false)
    }
  }

  const handleInstallLater = () => {
    if (!installActionsEnabled) return
    savePwaInstallLater()
    setErrorMessage('')
    advanceToNextStep()
  }

  const handleInstallErledigt = () => {
    if (!installActionsEnabled) return
    if (avatarGender) applyAppIcons(avatarGender)
    setOnboardingPwaInstallAcknowledged(true)
    setErrorMessage('')
    saveOnboardingDraft({
      ...buildOnboardingDraft(),
      onboardingPwaInstallAcknowledged: true,
    })

    if (isStandaloneDisplayMode()) {
      advanceToNextStep()
      return
    }

    setShowOpenPwaHint(true)
  }

  const handleOpenPwaHintContinue = () => {
    setShowOpenPwaHint(false)
    advanceToNextStep()
  }

  const handleOpenPwaHintCloseTab = () => {
    saveOnboardingDraft({
      ...buildOnboardingDraft(),
      onboardingPwaInstallAcknowledged: true,
    })
    window.close()
  }

  const conflictNameFormatted = formatUsernameInput(username).trim()
  const conflictNameReady =
    usernameConflict &&
    conflictNameFormatted.length > 0 &&
    /[\p{L}\p{N}]/u.test(conflictNameFormatted)

  const goNext = () => {
    if (usernameRestoreActive) {
      void handleRestoreAccount()
      return
    }
    if (!hasStarted) return
    if (!validateCurrentStep()) return
    if (isInputStep || showNameInputShell) stepInputRef.current?.blur()
    if (isInstallStep) return
    if (stepId === 'weightKg') {
      void verifyUsernameAfterWeightAndAdvance()
      return
    }
    if (isStartStep) {
      void createProfileAndAdvance()
      return
    }
    if (isRecoveryStep) {
      void finishRecoveryStep()
      return
    }
    advanceToNextStep()
  }

  const goBack = () => {
    if (!hasStarted) return
    if (usernameRestoreOpen && isUsernameStep) {
      setUsernameRestoreOpen(false)
      setRestoreCodeInput('')
      setErrorMessage('')
      return
    }
    setErrorMessage('')
    setUsernameConflict(false)
    const nextIndex = Math.max(0, stepIndex - 1)
    if (STEPS[nextIndex] === 'username' || STEPS[nextIndex] === 'weightKg') {
      setUsernameValidated(false)
      clearStoredUsername()
    }
    setStepIndex(nextIndex)
  }

  const selectGender = (value: GenderOption) => {
    setGender(value)
    advanceToNextStep()
  }

  const selectAvatarGender = (value: AvatarGender) => {
    setAvatarGender(value)
    setPreviewAvatarGender(value)
    applyAppIcons(value)
    saveAvatarDisplayCache({
      src: getAvatarImagePath(1, value),
      avatarGender: value,
    })
    advanceToNextStep()
  }

  const renderTextInput = (conflictEdit = false) => (
    <div className={inputCardClass}>
      {!conflictEdit ? (
        <label
          htmlFor="lifexp-onboarding-display-name"
          className="block px-3 pt-3 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400"
        >
          Name
        </label>
      ) : null}
      <form
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault()
          if (conflictEdit) {
            if (conflictNameReady) void handleConflictContinue()
          } else goNext()
        }}
      >
        <input
          id={conflictEdit ? 'lifexp-onboarding-name-retry' : 'lifexp-onboarding-display-name'}
          ref={stepInputRef}
          {...(conflictEdit ? displayNameConflictInputProps() : displayNameInputProps())}
          enterKeyHint={conflictEdit ? 'done' : 'next'}
          value={username}
          readOnly={conflictEdit && conflictNameInputLocked}
          aria-label={conflictEdit ? 'Neuer Name' : 'Name'}
          data-1p-ignore="true"
          data-lpignore="true"
          data-form-type="other"
          onFocus={() => scrollInputIntoComfortableView(stepInputRef.current)}
          onChange={(e) => {
            setUsername(e.target.value.replace(/[^\p{L}\p{N}\s'-]/gu, '').slice(0, 40))
            if (conflictEdit && errorMessage) setErrorMessage('')
            if (!conflictEdit) {
              setUsernameValidated(false)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (conflictEdit) {
                if (conflictNameReady) void handleConflictContinue()
              } else goNext()
            }
          }}
          className={conflictEdit ? `${textInputClass} px-3 pt-3` : textInputClass}
          placeholder={INPUT_PLACEHOLDERS.username}
          maxLength={40}
        />
      </form>
    </div>
  )

  const renderNumericInput = (id: 'age' | 'heightCm' | 'weightKg') => {
    const value = id === 'age' ? age : id === 'heightCm' ? heightCm : weightKg
    const setValue = id === 'age' ? setAge : id === 'heightCm' ? setHeightCm : setWeightKg
    const fieldName =
      id === 'age' ? 'lifexp-age' : id === 'heightCm' ? 'lifexp-height-cm' : 'lifexp-weight-kg'
    return (
      <div className={inputCardClass}>
        <input
          key={id}
          ref={stepInputRef}
          {...integerInputProps(fieldName)}
          pattern="[0-9]*"
          enterKeyHint="next"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 3))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              goNext()
            }
          }}
          className={numericInputClass}
          placeholder={INPUT_PLACEHOLDERS[id]}
          maxLength={3}
          aria-label={STEP_TITLES[id]}
        />
      </div>
    )
  }

  const nameConflictInputShell = () => (
    <div className={`${ONBOARDING_BACKDROP_CLASS} flex flex-col overflow-hidden`}>
      <header className="mx-auto w-full max-w-md shrink-0 px-4 pt-[max(0.65rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Schritt {stepIndex + 1} von {STEPS.length}
          </p>
          <ThemeToggle />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-md min-h-0 flex-1 flex-col px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="shrink-0 pt-3">
          <h1 className="text-center text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {STEP_TITLES.username}
          </h1>
          <p className="mt-1.5 text-center text-xs leading-relaxed text-sky-900 dark:text-sky-100">
            Dieser Name ist schon vergeben. Wähle einen anderen — alle Eingaben bleiben gespeichert.
          </p>
          <div className="mt-2 w-full" aria-live="polite">
            {renderTextInput(true)}
          </div>
          <button
            type="button"
            onClick={() => {
              stepInputRef.current?.blur()
              void handleConflictContinue()
            }}
            disabled={submitting || !conflictNameReady}
            className="lifexp-pressable-3d mt-2 w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-bold text-white hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-60 dark:border-emerald-500"
          >
            {submitting ? 'Wird geprüft …' : isRecoveryStep ? 'Erledigt!' : isStartStep ? 'LifeXP starten' : 'Weiter'}
          </button>
          {errorMessage ? (
            <p className="mt-1.5 text-center text-xs font-medium text-red-700 dark:text-red-300">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <div className="min-h-0 flex-1" aria-hidden />
      </div>
    </div>
  )

  const numericInputShell = (body: ReactNode) => (
    <div
      className={`${ONBOARDING_BACKDROP_CLASS} flex flex-col overflow-hidden`}
      style={{ paddingBottom: `max(${keyboardInset}px, env(safe-area-inset-bottom))` }}
    >
      <header className="mx-auto w-full max-w-md shrink-0 px-4 pt-[max(0.65rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Schritt {stepIndex + 1} von {STEPS.length}
          </p>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md min-h-0 flex-1 flex-col items-center justify-center px-4">
        {body}
      </main>
      <footer className="mx-auto w-full max-w-md shrink-0 px-4 pb-2">
        {errorMessage ? (
          <p className="mb-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex gap-2">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={submitting}
              className="lifexp-pressable-3d rounded-2xl border-2 border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 px-4 py-3 text-sm font-bold text-stone-800 hover:border-stone-500 disabled:opacity-60 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-stone-100"
            >
              Zurück
            </button>
          ) : null}
          <button
            type="button"
            onClick={goNext}
            disabled={submitting}
            className="lifexp-pressable-3d flex-1 rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-bold text-white hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-60 dark:border-emerald-500"
          >
            {submitting ? 'Wird geprüft …' : isRecoveryStep ? 'Erledigt!' : isStartStep ? 'LifeXP starten' : 'Weiter'}
          </button>
        </div>
      </footer>
    </div>
  )

  const renderStepBody = () => {
    if (!hasStarted) {
      return (
        <p className="max-w-xs text-sm text-slate-600 dark:text-slate-400">
          Kurz einrichten – Avatar und Streak warten schon auf dich.
        </p>
      )
    }

    switch (stepId) {
      case 'username':
        if (usernameRestoreOpen) {
          return (
            <div className="flex flex-col gap-3">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Gib deinen Recovery-Code ein (z. B. LIFE-7K3P-92XQ), um deinen Account
                wiederherzustellen — das Onboarding wird übersprungen.
              </p>
              <div className={inputCardClass}>
                <input
                  type="text"
                  value={restoreCodeInput}
                  onChange={(event) =>
                    setRestoreCodeInput(normalizeRecoveryCodeInput(event.target.value))
                  }
                  placeholder="LIFE-7K3P-92XQ"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={restoreLocked || submitting}
                  className={`${textInputClass} text-center text-xl tracking-[0.08em] disabled:opacity-50`}
                  aria-label="Recovery-Code"
                />
              </div>
              {restoreLocked ? (
                <p
                  className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
                  role="alert"
                >
                  Zu viele Fehlversuche. Recovery-Code-Eingabe ist vorübergehend gesperrt.
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setUsernameRestoreOpen(false)
                  setRestoreCodeInput('')
                  setErrorMessage('')
                }}
                className="text-left text-xs font-semibold text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
              >
                ← Neuen Benutzernamen anlegen
              </button>
            </div>
          )
        }
        return (
          <>
            {STEP_HINTS.username ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">{STEP_HINTS.username}</p>
            ) : null}
            {renderTextInput()}
            <button
              type="button"
              onClick={() => {
                setUsernameRestoreOpen(true)
                setErrorMessage('')
              }}
              className="mt-4 w-full text-center text-xs font-semibold text-slate-500 underline-offset-2 hover:text-emerald-700 hover:underline dark:text-slate-400 dark:hover:text-emerald-300"
            >
              Benutzer aus Recovery-Code wiederherstellen
            </button>
          </>
        )
      case 'gender':
        return (
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">Geschlecht</legend>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectGender(option.value)}
                  className={choiceButtonClass(gender === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        )
      case 'avatarGender':
        return (
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">Anzeige Avatar</legend>
            <div className="grid grid-cols-2 gap-3">
              {AVATAR_GENDER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectAvatarGender(option.value)}
                  className={choiceButtonClass(avatarGender === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        )
      case 'goalType':
        return (
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">Hauptziel</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {GOAL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGoalType(option.value)}
                  className={goalButtonClass(goalType === option.value)}
                >
                  <GoalOptionLabel option={option} layout="inline" />
                </button>
              ))}
            </div>
            <p className={GOAL_CHANGE_HINT_CLASS}>{GOAL_CHANGE_HINT}</p>
          </fieldset>
        )
      case 'homeScreenInstall':
        return (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              So startest du LifeXP wie eine App — schneller Zugriff vom Home-Bildschirm.
            </p>
            {!installActionsEnabled ? (
              <p className="rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
                Bitte zuerst Gewicht eingeben und den Namen bestätigen — danach kannst du die App
                zum Home-Bildschirm hinzufügen.
              </p>
            ) : null}
            <PwaInstallPanel compact avatarGender={avatarGender ?? undefined} />
          </div>
        )
      case 'start': {
        const displayName = formatUsernameInput(username).trim()
        const weightNum = parseInt(weightKg, 10)
        const showNutritionPreview = Boolean(gender) && Number.isFinite(weightNum) && weightNum > 0
        return (
          <div className="flex flex-col gap-3 text-base leading-relaxed text-slate-700 dark:text-slate-300">
            <p className="text-base leading-snug text-slate-800 dark:text-slate-100">
              Mit „LifeXP starten“ legen wir dein Profil an
              {displayName ? (
                <>
                  {' '}
                  — du heißt{' '}
                  <span className="font-bold text-emerald-800 dark:text-emerald-200">{displayName}</span>.
                </>
              ) : (
                '.'
              )}
            </p>
            {showNutritionPreview ? (
              <div className="rounded-2xl border-2 border-emerald-300/90 bg-emerald-50/95 px-3 py-3 dark:border-emerald-700/55 dark:bg-emerald-950/40">
                <p className="text-sm font-bold leading-snug text-slate-900 dark:text-slate-100">
                  Aufgrund deiner Eingaben und deines Ziels haben wir folgende Optimalwerte für dich
                  ermittelt:
                </p>
                {nutritionOptPreview.loading ? (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Werte werden geladen …</p>
                ) : nutritionOptPreview.kcalOpt !== null && nutritionOptPreview.protOpt !== null ? (
                  <div className="mt-3 flex flex-col gap-3">
                    <OnboardingNutritionOptRow
                      label="Kalorien / Tag"
                      operator="≤"
                      value={nutritionOptPreview.kcalOpt}
                      unit="kcal"
                    />
                    <OnboardingNutritionOptRow
                      label="Protein / Tag"
                      operator=">"
                      value={nutritionOptPreview.protOpt}
                      unit="g"
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-amber-900 dark:text-amber-200">
                    Optimalwerte konnten gerade nicht geladen werden — du kannst sie später unter
                    Ernährung anpassen.
                  </p>
                )}
                <p className="mt-3 text-xs leading-snug text-slate-600 dark:text-slate-400">
                  Diese Werte kannst du bei Bedarf später ändern.
                </p>
              </div>
            ) : null}
          </div>
        )
      }
      case 'recoveryCode':
        return <RecoveryCodePanel code={createdRecoveryCode} variant="onboarding" />
      default:
        return null
    }
  }

  const sheetTitle = !hasStarted
    ? 'Dein Fortschritt startet hier'
    : usernameRestoreActive
      ? 'Account wiederherstellen'
      : STEP_TITLES[stepId]

  const primaryActionLabel = () => {
    if (submitting) {
      if (usernameRestoreActive) return 'Wird wiederhergestellt …'
      if (isRecoveryStep) return 'Wird gespeichert …'
      if (isStartStep) return 'Wird gestartet …'
      return 'Wird geprüft …'
    }
    if (usernameRestoreActive) return 'Wiederherstellen'
    if (!hasStarted) return 'Weiter'
    if (isRecoveryStep) return 'Erledigt!'
    if (isStartStep) return 'LifeXP starten'
    return 'Weiter'
  }

  const introSplash = isIntroScreen && !introSheetVisible
  const introControlsLocked = isIntroScreen && !introReady
  const showWelcomeSheet = hasStarted || introSheetVisible
  const preOnboardingSheetInteractive = introSheetVisible && introReady && !hasStarted

  const readPreOnboardingSeconds = useCallback(() => {
    if (preOnboardingSheetInteractive) return 0
    if (introSheetVisible && !introReady) return 1
    const startedAt = introStartedAtRef.current
    if (!startedAt) return 0
    return secondsUntilIntroSheet(Date.now() - startedAt)
  }, [introSheetVisible, introReady, preOnboardingSheetInteractive])

  useEffect(() => {
    if (introStartedAtRef.current === 0) {
      introStartedAtRef.current = Date.now()
    }
  }, [])

  useEffect(() => {
    if (hasStarted) setPreOnboardingTapHint(false)
  }, [hasStarted])

  useEffect(() => {
    if (!preOnboardingTapHint) return
    const tick = () => setPreOnboardingTapSeconds(readPreOnboardingSeconds())
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [preOnboardingTapHint, readPreOnboardingSeconds])

  useEffect(() => {
    if (!preOnboardingTapHint) return
    const id = window.setTimeout(() => setPreOnboardingTapHint(false), 3500)
    return () => window.clearTimeout(id)
  }, [preOnboardingTapHint])

  const handlePreOnboardingPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (hasStarted) return
    preOnboardingPointerStartRef.current = { x: event.clientX, y: event.clientY }
  }

  const handlePreOnboardingPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (hasStarted) return
    const start = preOnboardingPointerStartRef.current
    preOnboardingPointerStartRef.current = null
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (dx * dx + dy * dy > 144) return
    if (event.target instanceof Element) {
      const interactive = event.target.closest(
        'button:not(:disabled), a[href], input, textarea, select',
      )
      if (interactive) return
    }
    setPreOnboardingTapSeconds(readPreOnboardingSeconds())
    setPreOnboardingTapHint(true)
  }

  const handlePreOnboardingPointerCancel = () => {
    preOnboardingPointerStartRef.current = null
  }

  const preOnboardingTapHintCounterText = preOnboardingTapHintCounter(
    preOnboardingTapSeconds,
    preOnboardingSheetInteractive,
  )

  const viewportHeight = viewport.height > 0 ? viewport.height : undefined

  if (showNameInputShell) {
    return nameConflictInputShell()
  }

  if (showNumericShell) {
    return numericInputShell(
      <>
        <h1 className="text-center text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {STEP_TITLES[stepId]}
        </h1>
        {STEP_HINTS[stepId] ? (
          <p className="mt-1 text-center text-sm text-slate-600 dark:text-slate-400">
            {STEP_HINTS[stepId]}
          </p>
        ) : null}
        <div className="w-full" aria-live="polite">
          {renderNumericInput(stepId)}
        </div>
      </>,
    )
  }

  return (
    <div
      className={`${ONBOARDING_BACKDROP_CLASS} ${
        introSplash ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden'
      }`}
      style={viewportHeight ? { height: viewportHeight } : { height: '100dvh' }}
      onPointerDown={handlePreOnboardingPointerDown}
      onPointerUp={handlePreOnboardingPointerUp}
      onPointerCancel={handlePreOnboardingPointerCancel}
    >
      {showOpenPwaHint ? (
        <div
          className="fixed inset-0 z-[40] flex items-center justify-center bg-slate-950/70 px-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="open-pwa-hint-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-emerald-500/40 bg-white p-5 shadow-xl dark:bg-slate-900">
            <h2
              id="open-pwa-hint-title"
              className="text-balance text-center text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              {isIosDevice()
                ? 'LifeXP vom Home-Bildschirm öffnen'
                : 'LifeXP als App öffnen'}
            </h2>
            <p className="mt-3 text-balance text-center text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {isIosDevice()
                ? 'Tippe auf das LifeXP-Symbol auf deinem Home-Bildschirm. Alle Eingaben bleiben gespeichert.'
                : 'Öffne LifeXP über das Symbol auf deinem Startbildschirm. Alle Eingaben bleiben gespeichert.'}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleOpenPwaHintContinue}
                className="lifexp-pressable-3d w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-bold text-white hover:from-emerald-400 hover:to-emerald-600 dark:border-emerald-500"
              >
                Im Browser fortsetzen
              </button>
              <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                Alle Eingaben bleiben bestehen.
              </p>
              <button
                type="button"
                onClick={handleOpenPwaHintCloseTab}
                className="lifexp-pressable-3d w-full rounded-2xl border-2 border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 px-4 py-3 text-sm font-bold text-stone-800 hover:border-stone-500 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-stone-100"
              >
                Diesen Tab schließen
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {preOnboardingTapHint && !hasStarted ? (
        <div
          className="pointer-events-none fixed inset-0 z-[30] flex items-center justify-center px-6"
          role="status"
          aria-live="polite"
        >
          <div className="max-w-sm rounded-2xl bg-black/40 px-4 py-8 shadow-[0_0_28px_8px_rgba(255,255,255,0.85),0_0_56px_16px_rgba(255,255,255,0.45)] backdrop-blur-sm sm:max-w-md sm:px-5 sm:py-9">
            <p className="text-balance text-center text-2xl font-bold leading-snug text-amber-200 sm:text-3xl">
              {PRE_ONBOARDING_WELCOME_HEADLINE}
            </p>
            <p className="mt-3 text-balance text-center text-base font-medium leading-snug text-amber-200/90 sm:text-lg">
              {PRE_ONBOARDING_WELCOME_SUBLINE}
            </p>
            <p className="mt-1 text-center text-sm font-medium text-amber-200/80 sm:text-base">
              {PRE_ONBOARDING_WELCOME_FREE_LINE}
            </p>
            {preOnboardingTapHintCounterText ? (
              <p className="mt-4 text-center text-xl font-bold tabular-nums leading-none text-amber-100 sm:text-2xl">
                {preOnboardingTapHintCounterText}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      <div
        className={`absolute left-0 right-0 top-0 z-0 transition-[height] duration-500 ease-out ${
          introSplash ? '' : 'overflow-hidden'
        }`}
        style={introSplash ? undefined : { height: sheetAvatarHeight }}
      >
        <HomeScreen
          level={1}
          totalXp={0}
          todayAvatarXp={0}
          avatarGender={previewAvatarGender}
          avatarPreviewSrc={introSplash ? introAvatarSrc : undefined}
          avatarPreviewEpoch={introSplash ? introAvatarEpoch : undefined}
          avatarFrameMaxPx={AVATAR_FRAME_INTRO_MAX_PX}
          streakPrompt="overview"
          areaStatuses={{ wissen: 'pending' }}
          showTaskPlannerHint={introSplash}
          showWasJetztTun={introSplash}
          showDayViewToggle={introSplash}
          interactive={false}
        />
      </div>

      {showWelcomeSheet ? (
        <div
          className={`${onboardingSheetClass} ${
            isIntroScreen && introSheetVisible ? 'lifexp-onboarding-sheet-reveal' : 'lifexp-onboarding-sheet--static'
          }`}
          style={{
            top: sheetAvatarHeight,
            maxHeight: sheetMaxHeight,
            paddingBottom: sheetPaddingBottom,
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-step-title"
        >
        <div
          className={`mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-4 pt-2 ${
            introControlsLocked ? 'pointer-events-none' : ''
          }`}
        >
          <div className="mb-2 flex shrink-0 items-center justify-center">
            <span className="h-1 w-9 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />
          </div>

          <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
            <p
              className={`text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 ${
                isIntroScreen ? 'tracking-[0.2em] text-emerald-600 dark:text-emerald-400' : ''
              }`}
            >
              {hasStarted ? `Schritt ${stepIndex + 1} von ${STEPS.length}` : 'LifeXP'}
            </p>
            <ThemeToggle />
          </div>

          <h2
            id="onboarding-step-title"
            className={`shrink-0 font-bold tracking-tight text-slate-900 dark:text-slate-100 ${
              isIntroScreen ? 'text-balance text-center text-xl' : 'text-lg'
            }`}
          >
            {sheetTitle}
          </h2>

          <div
            className={
              isNameStep
                ? 'mt-3 shrink-0'
                : preOnboardingSheetInteractive
                  ? 'mt-3 flex min-h-0 flex-1 flex-col items-center justify-center gap-6 text-center'
                  : isInstallStep
                    ? 'mt-2 flex min-h-0 flex-1 flex-col'
                    : isIntroScreen
                      ? 'mt-3 min-h-0 flex-1'
                      : 'mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain'
            }
          >
            <div className={isInstallStep ? 'shrink-0' : undefined}>{renderStepBody()}</div>
            {isInstallStep ? (
              <div className="mt-4 flex w-full shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleInstallLater}
                  disabled={!installActionsEnabled}
                  className="lifexp-pressable-3d flex-1 rounded-2xl border-2 border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 px-4 py-3 text-sm font-bold text-stone-800 hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-45 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-stone-100"
                >
                  Vielleicht später
                </button>
                <button
                  type="button"
                  onClick={handleInstallErledigt}
                  disabled={!installActionsEnabled}
                  className="lifexp-pressable-3d flex-1 rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-bold text-white hover:from-emerald-400 hover:to-emerald-600 disabled:cursor-not-allowed disabled:opacity-45 dark:border-emerald-500"
                >
                  Erledigt!
                </button>
              </div>
            ) : null}
            {preOnboardingSheetInteractive ? (
              <button
                type="button"
                onClick={startQuestions}
                disabled={submitting}
                className="lifexp-pressable-3d w-full max-w-sm rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-bold text-white hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-60 dark:border-emerald-500"
              >
                Weiter
              </button>
            ) : null}
            {isInstallStep || preOnboardingSheetInteractive ? (
              <div className="min-h-0 flex-1" aria-hidden />
            ) : null}
          </div>

          {preOnboardingSheetInteractive || isInstallStep ? (
            <div className="shrink-0 pb-1" aria-hidden />
          ) : (
          <div className={onboardingSheetFooterClass}>
            {errorMessage ? (
              <p className="mb-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                {errorMessage}
              </p>
            ) : null}
            <div className="flex gap-2">
              {(hasStarted && stepIndex > 0 && !isInstallStep && !isRecoveryStep) ||
              usernameRestoreActive ? (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={submitting}
                  className="lifexp-pressable-3d rounded-2xl border-2 border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 px-4 py-3 text-sm font-bold text-stone-800 hover:border-stone-500 disabled:opacity-60 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-stone-100"
                >
                  Zurück
                </button>
              ) : null}
              {isInstallStep ? null : isIntroScreen && !introReady ? (
                <div
                  className="flex h-[50px] flex-1 items-center justify-center text-sm text-slate-400 dark:text-slate-500"
                  aria-hidden
                />
              ) : (
                <button
                  type="button"
                  onClick={hasStarted ? goNext : startQuestions}
                  disabled={
                    submitting ||
                    introControlsLocked ||
                    (usernameRestoreActive && restoreLocked)
                  }
                  className="lifexp-pressable-3d flex-1 rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-bold text-white hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-60 dark:border-emerald-500"
                >
                  {primaryActionLabel()}
                </button>
              )}
            </div>
          </div>
          )}
        </div>
        </div>
      ) : null}
    </div>
  )
}
