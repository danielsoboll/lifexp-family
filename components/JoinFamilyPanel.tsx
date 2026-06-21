'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import OnboardingProfileFields from './OnboardingProfileFields'
import OnboardingPwaStep from './OnboardingPwaStep'
import OnboardingRecoveryStep from './OnboardingRecoveryStep'
import OpenPwaHint from './OpenPwaHint'
import QrCodeScanner from './QrCodeScanner'
import { useFamilyOnboardingBridge } from '../hooks/useFamilyOnboardingBridge'
import { joinFamilyWithInviteCode } from '../lib/family/families'
import { updateMemberAppInstalled, updateMemberAppLater } from '../lib/family/memberSettings'
import {
  bootstrapOnboardingBridge,
  flushOnboardingBridge,
  persistFamilyOnboardingDraft,
} from '../lib/family/onboardingBridge'
import {
  commitFocusedFormField,
  deferFlushOnboardingBridge,
  readJoinFormSnapshot,
  resolveOnboardingPendingCredentials,
  type JoinFormSnapshot,
} from '../lib/family/onboardingPanelDraft'
import {
  clearFamilyOnboardingDraft,
  loadFamilyOnboardingDraft,
  mergeJoinStep,
  type FamilyOnboardingDraft,
  type JoinOnboardingStep,
} from '../lib/family/onboardingDraft'
import { parseAgeInput } from '../lib/family/memberGender'
import {
  onboardingProfileFromForm,
  type OnboardingDevicePrefs,
  type OnboardingMemberGender,
} from '../lib/family/onboardingMember'
import { normalizeInviteCodeInput, parseInviteCodeFromQr } from '../lib/parseInviteCode'
import { storeFamilySession, type FamilySession } from '../lib/familySession'
import { isStandaloneDisplayMode } from '../lib/pwaInstall'
import { FORM_FIELD_INPUT_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'
import { oneLineTextInputProps } from '../lib/formInputAutofill'

type JoinFamilyPanelProps = {
  onBack: () => void
}

type JoinState = {
  step: JoinOnboardingStep
  inviteCode: string
  displayName: string
  gender: OnboardingMemberGender
  ageInput: string
  recoveryCode: string
  pendingSession: FamilySession | null
  pwaInstallAcknowledged: boolean
}

function joinStateFromDraft(): JoinState {
  const draft = loadFamilyOnboardingDraft()
  if (draft?.mode !== 'join') {
    return {
      step: 'choice',
      inviteCode: '',
      displayName: '',
      gender: 'male',
      ageInput: '',
      recoveryCode: '',
      pendingSession: null,
      pwaInstallAcknowledged: false,
    }
  }

  return {
    step: draft.step,
    inviteCode: draft.inviteCode,
    displayName: draft.displayName,
    gender: draft.gender,
    ageInput: draft.ageInput,
    recoveryCode: draft.recoveryCode ?? '',
    pendingSession: draft.pendingSession ?? null,
    pwaInstallAcknowledged: draft.pwaInstallAcknowledged === true,
  }
}

export default function JoinFamilyPanel({ onBack }: JoinFamilyPanelProps) {
  const router = useRouter()
  const draftHydratedRef = useRef(false)
  const submitBusyRef = useRef(false)
  const onboardingBusyRef = useRef(false)
  const stepRef = useRef<JoinOnboardingStep>('choice')
  const genderRef = useRef<OnboardingMemberGender>('male')
  const loadingRef = useRef(false)
  const standaloneInstallResumeRef = useRef(false)
  const [step, setStep] = useState<JoinOnboardingStep>('choice')
  const [inviteCode, setInviteCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [gender, setGender] = useState<OnboardingMemberGender>('male')
  const [ageInput, setAgeInput] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [pendingSession, setPendingSession] = useState<FamilySession | null>(null)
  const [pwaInstallAcknowledged, setPwaInstallAcknowledged] = useState(false)
  const [showOpenPwaHint, setShowOpenPwaHint] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  stepRef.current = step
  genderRef.current = gender
  loadingRef.current = loading

  const buildDraft = useCallback((): FamilyOnboardingDraft => {
    return {
      version: 1,
      incomplete: true,
      hasStarted: true,
      mode: 'join',
      step,
      inviteCode,
      displayName,
      gender,
      ageInput,
      pwaInstallAcknowledged,
      recoveryCode: recoveryCode || undefined,
      pendingSession: pendingSession ?? undefined,
    }
  }, [step, inviteCode, displayName, gender, ageInput, pwaInstallAcknowledged, recoveryCode, pendingSession])

  const saveDraftQuiet = useCallback(
    (patch?: Partial<Extract<FamilyOnboardingDraft, { mode: 'join' }>>) => {
      const draft = { ...buildDraft(), ...patch } as Extract<FamilyOnboardingDraft, { mode: 'join' }>
      persistFamilyOnboardingDraft(draft)
    },
    [buildDraft],
  )

  const applyDraftSnapshot = useCallback((snapshot: JoinState) => {
    setStep((current) => mergeJoinStep(current, snapshot.step))
    setInviteCode(snapshot.inviteCode)
    setDisplayName(snapshot.displayName)
    setGender(snapshot.gender)
    setAgeInput(snapshot.ageInput)
    setRecoveryCode(snapshot.recoveryCode)
    setPendingSession(snapshot.pendingSession)
    setPwaInstallAcknowledged(snapshot.pwaInstallAcknowledged)
    setShowOpenPwaHint(false)
  }, [])

  const resyncFromStorage = useCallback(() => {
    if (submitBusyRef.current || onboardingBusyRef.current || loadingRef.current) return
    if (stepRef.current === 'install' || stepRef.current === 'recovery') return
    bootstrapOnboardingBridge()
    const draft = loadFamilyOnboardingDraft()
    if (draft?.mode !== 'join') return
    applyDraftSnapshot({
      step: draft.step,
      inviteCode: draft.inviteCode,
      displayName: draft.displayName,
      gender: draft.gender,
      ageInput: draft.ageInput,
      recoveryCode: draft.recoveryCode ?? '',
      pendingSession: draft.pendingSession ?? null,
      pwaInstallAcknowledged: draft.pwaInstallAcknowledged === true,
    })
  }, [applyDraftSnapshot])

  useFamilyOnboardingBridge({ onResume: resyncFromStorage })

  useEffect(() => {
    if (draftHydratedRef.current) return
    draftHydratedRef.current = true
    bootstrapOnboardingBridge()
    applyDraftSnapshot(joinStateFromDraft())
  }, [applyDraftSnapshot])

  useEffect(() => {
    if (!draftHydratedRef.current) return
    if (submitBusyRef.current || onboardingBusyRef.current || loadingRef.current) return
    if (step === 'install' || step === 'recovery') return

    const timer = window.setTimeout(() => {
      if (submitBusyRef.current || onboardingBusyRef.current || loadingRef.current) return
      persistFamilyOnboardingDraft(buildDraft())
    }, 400)

    return () => window.clearTimeout(timer)
  }, [buildDraft, step])

  const applyFormSnapshot = (snapshot: JoinFormSnapshot) => {
    setInviteCode(snapshot.inviteCode)
    setDisplayName(snapshot.displayName)
    setGender(snapshot.gender)
    setAgeInput(snapshot.ageInput)
  }

  const finishOnboarding = () => {
    onboardingBusyRef.current = true
    const resolved = resolveOnboardingPendingCredentials(pendingSession, recoveryCode)
    clearFamilyOnboardingDraft()
    deferFlushOnboardingBridge()
    router.replace('/')
    if (resolved) {
      storeFamilySession(resolved.session)
    }
  }

  const goToRecoveryStep = (
    session: FamilySession,
    code: string,
    prefs?: OnboardingDevicePrefs,
  ) => {
    onboardingBusyRef.current = true
    setShowOpenPwaHint(false)
    setPwaInstallAcknowledged(true)
    setPendingSession(session)
    setRecoveryCode(code)
    setStep('recovery')
    saveDraftQuiet({
      step: 'recovery',
      pwaInstallAcknowledged: true,
      pendingSession: session,
      recoveryCode: code,
    })
    if (prefs) {
      void syncDevicePrefs(session, prefs)
    }
  }

  const handleBackToWelcome = () => {
    if (step === 'choice') {
      clearFamilyOnboardingDraft()
      flushOnboardingBridge()
    }
    onBack()
  }

  const ensureJoined = async (
    code: string,
    snapshot?: JoinFormSnapshot,
  ): Promise<{ session: FamilySession; recoveryCode: string } | null> => {
    const normalized = normalizeInviteCodeInput(code)
    if (!normalized) {
      setError('Bitte einen Einladungscode eingeben.')
      submitBusyRef.current = false
      setLoading(false)
      return null
    }

    const resolved = resolveOnboardingPendingCredentials(pendingSession, recoveryCode)
    if (resolved) {
      setPendingSession(resolved.session)
      setRecoveryCode(resolved.recoveryCode)
      setStep('install')
      submitBusyRef.current = false
      setLoading(false)
      return resolved
    }

    const form = snapshot ?? {
      inviteCode: normalized,
      displayName,
      gender: genderRef.current,
      ageInput,
    }

    const age = parseAgeInput(form.ageInput)
    const { profile, error: profileError } = onboardingProfileFromForm({
      displayName: form.displayName,
      gender: form.gender,
      age,
    })
    if (profileError || !profile) {
      setError(profileError ?? 'Profil unvollständig.')
      submitBusyRef.current = false
      setLoading(false)
      return null
    }

    setLoading(true)
    setError(null)
    submitBusyRef.current = true
    let result: Awaited<ReturnType<typeof joinFamilyWithInviteCode>>['result'] = null
    let joinError: Error | null = null
    try {
      ;({ result, error: joinError } = await joinFamilyWithInviteCode(normalized, profile, {
        appInstalled: false,
        appLater: false,
      }))
    } finally {
      submitBusyRef.current = false
      setLoading(false)
    }

    if (joinError) {
      setError(joinError.message)
      return null
    }
    if (!result) {
      setError('Verbindung fehlgeschlagen.')
      return null
    }

    setInviteCode(normalized)
    setPendingSession(result.session)
    setRecoveryCode(result.recoveryCode)
    setStep('install')
    saveDraftQuiet({
      inviteCode: normalized,
      displayName: form.displayName,
      gender: form.gender,
      ageInput: form.ageInput,
      pendingSession: result.session,
      recoveryCode: result.recoveryCode,
      step: 'install',
    })
    return { session: result.session, recoveryCode: result.recoveryCode }
  }

  const syncDevicePrefs = async (session: FamilySession, prefs: OnboardingDevicePrefs) => {
    await updateMemberAppInstalled(session.memberKind, session.memberId, prefs.appInstalled)
    await updateMemberAppLater(session.memberKind, session.memberId, prefs.appLater)
  }

  const tryGoToRecovery = (prefs?: OnboardingDevicePrefs): boolean => {
    const resolved = resolveOnboardingPendingCredentials(pendingSession, recoveryCode)
    if (!resolved) return false
    goToRecoveryStep(resolved.session, resolved.recoveryCode, prefs)
    return true
  }

  const advanceToRecovery = async (code: string, prefs?: OnboardingDevicePrefs) => {
    if (tryGoToRecovery(prefs)) return

    const joined = await ensureJoined(code)
    if (!joined) return
    goToRecoveryStep(joined.session, joined.recoveryCode, prefs)
  }

  useEffect(() => {
    if (standaloneInstallResumeRef.current) return
    if (step !== 'install' || !inviteCode.trim()) return
    if (!isStandaloneDisplayMode()) return
    if (!pendingSession || !recoveryCode) return

    standaloneInstallResumeRef.current = true
    onboardingBusyRef.current = true
    setShowOpenPwaHint(false)
    setPwaInstallAcknowledged(true)
    setPendingSession(pendingSession)
    setRecoveryCode(recoveryCode)
    setStep('recovery')
    saveDraftQuiet({ step: 'recovery', pwaInstallAcknowledged: true })
    void syncDevicePrefs(pendingSession, { appInstalled: true, appLater: false })
  }, [step, inviteCode, pendingSession, recoveryCode, saveDraftQuiet])

  const proceedToInstall = async (code: string, snapshot?: JoinFormSnapshot) => {
    await ensureJoined(code, snapshot)
  }

  const handleInstallDone = () => {
    if (
      tryGoToRecovery({
        appInstalled: isStandaloneDisplayMode(),
        appLater: false,
      })
    ) {
      return
    }

    void advanceToRecovery(inviteCode, { appInstalled: isStandaloneDisplayMode(), appLater: false })
  }

  const handleInstallLater = () => {
    if (tryGoToRecovery({ appInstalled: false, appLater: true })) return
    void advanceToRecovery(inviteCode, { appInstalled: false, appLater: true })
  }

  const handleContinueInBrowserFromPwaHint = () => {
    if (tryGoToRecovery({ appInstalled: true, appLater: false })) return
    void advanceToRecovery(inviteCode, { appInstalled: true, appLater: false })
  }

  const handleCloseTabFromPwaHint = () => {
    saveDraftQuiet({ pwaInstallAcknowledged: true })
    deferFlushOnboardingBridge()
    window.close()
  }

  const recoveryCredentials = resolveOnboardingPendingCredentials(pendingSession, recoveryCode)

  const handleCodeSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (loading || submitBusyRef.current) return

    commitFocusedFormField()
    const snapshot = readJoinFormSnapshot({
      inviteCode,
      displayName,
      gender: genderRef.current,
      ageInput,
    })
    applyFormSnapshot(snapshot)

    submitBusyRef.current = true
    setLoading(true)
    setError(null)

    await proceedToInstall(snapshot.inviteCode, snapshot)
  }

  const handleScannedCode = (raw: string) => {
    const parsed = parseInviteCodeFromQr(raw)
    if (!parsed) {
      setError('QR-Code konnte nicht gelesen werden.')
      return
    }
    setInviteCode(parsed)
    setError(null)
    setStep('confirm')
  }

  const profileFields = (
    <OnboardingProfileFields
      displayName={displayName}
      onDisplayNameChange={setDisplayName}
      gender={gender}
      onGenderChange={setGender}
      ageInput={ageInput}
      onAgeInputChange={setAgeInput}
    />
  )

  if (step === 'install') {
    return (
      <>
        {showOpenPwaHint ? (
          <OpenPwaHint
            onContinueInBrowser={handleContinueInBrowserFromPwaHint}
            onCloseTab={handleCloseTabFromPwaHint}
          />
        ) : null}
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setStep(inviteCode ? 'confirm' : 'code')}
            className="text-sm font-semibold text-emerald-700 underline dark:text-emerald-300"
          >
            ← Zurück
          </button>
          {inviteCode ? (
            <p className="text-sm text-slate-950 dark:text-slate-400">
              Code: <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{inviteCode}</span>
            </p>
          ) : null}
          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : null}
          <OnboardingPwaStep
            onInstallDone={handleInstallDone}
            onInstallLater={handleInstallLater}
            disabled={loading}
          />
        </div>
      </>
    )
  }

  if (step === 'recovery' && recoveryCredentials) {
    return (
      <OnboardingRecoveryStep
        recoveryCode={recoveryCredentials.recoveryCode}
        session={recoveryCredentials.session}
        onFinished={finishOnboarding}
      />
    )
  }

  if (step === 'choice') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleBackToWelcome}
          className="text-sm font-semibold text-emerald-700 underline dark:text-emerald-300"
        >
          ← Zurück
        </button>
        <p className="text-sm text-slate-950 dark:text-slate-400">Wie möchtest du dich mit deiner Familie verbinden?</p>
        <button
          type="button"
          onClick={() => {
            setError(null)
            setStep('code')
          }}
          className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-bold text-white`}
        >
          Code eingeben
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null)
            setStep('scan')
          }}
          className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200 to-stone-400/80 px-4 py-3 text-base font-bold text-stone-900 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-stone-100`}
        >
          Code scannen
        </button>
      </div>
    )
  }

  if (step === 'scan') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            setError(null)
            setStep('choice')
          }}
          className="text-sm font-semibold text-emerald-700 underline dark:text-emerald-300"
        >
          ← Zurück
        </button>
        <QrCodeScanner onCode={handleScannedCode} onError={setError} />
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  if (step === 'confirm') {
    return (
      <form noValidate onSubmit={(event) => void handleCodeSubmit(event)} className="space-y-4">
        <button
          type="button"
          onClick={() => {
            setError(null)
            setStep('scan')
          }}
          className="text-sm font-semibold text-emerald-700 underline dark:text-emerald-300"
        >
          ← Erneut scannen
        </button>
        <p className="text-sm text-slate-950 dark:text-slate-400">
          Code erkannt: <span className="font-bold text-slate-900 dark:text-slate-100">{inviteCode}</span>
        </p>
        {profileFields}
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-bold text-white disabled:opacity-45`}
        >
          {loading ? 'Wird verbunden …' : 'Weiter'}
        </button>
      </form>
    )
  }

  return (
    <form noValidate onSubmit={(event) => void handleCodeSubmit(event)} className="space-y-4">
      <button
        type="button"
        onClick={() => {
          setError(null)
          setStep('choice')
        }}
        className="text-sm font-semibold text-emerald-700 underline dark:text-emerald-300"
      >
        ← Zurück
      </button>
      <div>
        <label htmlFor="join-invite-code" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Einladungscode
        </label>
        <input
          id="join-invite-code"
          required
          maxLength={40}
          autoComplete="off"
          spellCheck={false}
          placeholder="z. B. ABCD-1234"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          className={`${FORM_FIELD_INPUT_CLASS} font-mono uppercase`}
          {...oneLineTextInputProps('lifexp-join-invite-code')}
        />
      </div>
      {profileFields}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-bold text-white disabled:opacity-45`}
      >
        {loading ? 'Wird verbunden …' : 'Weiter'}
      </button>
    </form>
  )
}
