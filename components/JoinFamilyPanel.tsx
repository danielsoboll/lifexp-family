'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import OnboardingProfileFields from './OnboardingProfileFields'
import OnboardingPwaStep from './OnboardingPwaStep'
import OnboardingRecoveryStep from './OnboardingRecoveryStep'
import OpenPwaHint from './OpenPwaHint'
import QrCodeScanner from './QrCodeScanner'
import { useFamily } from './FamilyProvider'
import { useFamilyOnboardingBridge } from '../hooks/useFamilyOnboardingBridge'
import { joinFamilyWithInviteCode } from '../lib/family/families'
import { updateMemberAppInstalled, updateMemberAppLater } from '../lib/family/memberSettings'
import {
  bootstrapOnboardingBridge,
  flushOnboardingBridge,
  persistFamilyOnboardingDraft,
} from '../lib/family/onboardingBridge'
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
import type { FamilySession } from '../lib/familySession'
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
  const { setSession } = useFamily()
  const draftHydratedRef = useRef(false)
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

  const persistDraft = useCallback(
    (patch?: Partial<Extract<FamilyOnboardingDraft, { mode: 'join' }>>) => {
      const draft = { ...buildDraft(), ...patch } as Extract<FamilyOnboardingDraft, { mode: 'join' }>
      persistFamilyOnboardingDraft(draft)
      flushOnboardingBridge()
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
    persistFamilyOnboardingDraft(buildDraft())
  }, [buildDraft])

  const finishOnboarding = () => {
    if (pendingSession) setSession(pendingSession)
    clearFamilyOnboardingDraft()
    flushOnboardingBridge()
    router.replace('/')
    router.refresh()
  }

  const handleBackToWelcome = () => {
    if (step === 'choice') {
      clearFamilyOnboardingDraft()
      flushOnboardingBridge()
    }
    onBack()
  }

  const ensureJoined = async (code: string): Promise<{ session: FamilySession; recoveryCode: string } | null> => {
    const normalized = normalizeInviteCodeInput(code)
    if (!normalized) {
      setError('Bitte einen Einladungscode eingeben.')
      return null
    }

    if (pendingSession && recoveryCode) {
      return { session: pendingSession, recoveryCode }
    }

    const age = parseAgeInput(ageInput)
    const { profile, error: profileError } = onboardingProfileFromForm({ displayName, gender, age })
    if (profileError || !profile) {
      setError(profileError ?? 'Profil unvollständig.')
      return null
    }

    setLoading(true)
    setError(null)
    const { result, error: joinError } = await joinFamilyWithInviteCode(normalized, profile, {
      appInstalled: false,
      appLater: false,
    })
    setLoading(false)

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
    persistDraft({
      inviteCode: normalized,
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

  const advanceToRecovery = async (code: string, prefs?: OnboardingDevicePrefs) => {
    const joined = await ensureJoined(code)
    if (!joined) return

    if (prefs) await syncDevicePrefs(joined.session, prefs)

    setShowOpenPwaHint(false)
    setPwaInstallAcknowledged(true)
    persistDraft({
      step: 'recovery',
      pwaInstallAcknowledged: true,
      pendingSession: joined.session,
      recoveryCode: joined.recoveryCode,
    })
    setStep('recovery')
  }

  useEffect(() => {
    if (standaloneInstallResumeRef.current) return
    if (step !== 'install' || !inviteCode.trim()) return
    if (!isStandaloneDisplayMode()) return
    if (!pendingSession || !recoveryCode) return

    standaloneInstallResumeRef.current = true
    setShowOpenPwaHint(false)
    setPwaInstallAcknowledged(true)
    void syncDevicePrefs(pendingSession, { appInstalled: true, appLater: false }).finally(() => {
      persistDraft({ step: 'recovery', pwaInstallAcknowledged: true })
      setStep('recovery')
    })
  }, [step, inviteCode, pendingSession, recoveryCode, persistDraft])

  const proceedToInstall = async (code: string) => {
    const joined = await ensureJoined(code)
    if (!joined) return
    persistDraft({ step: 'install' })
    setStep('install')
  }

  const handleInstallDone = async () => {
    const joined = await ensureJoined(inviteCode)
    if (!joined) return

    setPwaInstallAcknowledged(true)
    persistDraft({ pwaInstallAcknowledged: true })

    if (isStandaloneDisplayMode()) {
      await advanceToRecovery(inviteCode, { appInstalled: true, appLater: false })
      return
    }

    setShowOpenPwaHint(true)
  }

  const handleContinueInBrowserFromPwaHint = () => {
    void advanceToRecovery(inviteCode, { appInstalled: true, appLater: false })
  }

  const handleCloseTabFromPwaHint = () => {
    persistDraft({ pwaInstallAcknowledged: true })
    flushOnboardingBridge()
    window.close()
  }

  const handleCodeSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    void proceedToInstall(inviteCode)
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
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Code: <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{inviteCode}</span>
            </p>
          ) : null}
          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : null}
          <OnboardingPwaStep
            onInstallDone={() => void handleInstallDone()}
            onInstallLater={() => void advanceToRecovery(inviteCode, { appInstalled: false, appLater: true })}
            disabled={loading}
          />
        </div>
      </>
    )
  }

  if (step === 'recovery' && pendingSession && recoveryCode) {
    return (
      <OnboardingRecoveryStep
        recoveryCode={recoveryCode}
        session={pendingSession}
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
        <p className="text-sm text-slate-600 dark:text-slate-400">Wie möchtest du dich mit deiner Familie verbinden?</p>
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
      <form onSubmit={handleCodeSubmit} className="space-y-4">
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
        <p className="text-sm text-slate-600 dark:text-slate-400">
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
    <form onSubmit={handleCodeSubmit} className="space-y-4">
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
