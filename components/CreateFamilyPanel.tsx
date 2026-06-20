'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import OnboardingProfileFields from './OnboardingProfileFields'
import OnboardingPwaStep from './OnboardingPwaStep'
import OnboardingRecoveryStep from './OnboardingRecoveryStep'
import OpenPwaHint from './OpenPwaHint'
import { useFamily } from './FamilyProvider'
import { useFamilyOnboardingBridge } from '../hooks/useFamilyOnboardingBridge'
import { createFamilyWithMember } from '../lib/family/families'
import { updateMemberAppInstalled, updateMemberAppLater } from '../lib/family/memberSettings'
import {
  bootstrapOnboardingBridge,
  flushOnboardingBridge,
  persistFamilyOnboardingDraft,
} from '../lib/family/onboardingBridge'
import {
  clearFamilyOnboardingDraft,
  loadFamilyOnboardingDraft,
  mergeCreateStep,
  type CreateOnboardingStep,
  type FamilyOnboardingDraft,
} from '../lib/family/onboardingDraft'
import { parseAgeInput } from '../lib/family/memberGender'
import {
  onboardingProfileFromForm,
  type OnboardingDevicePrefs,
  type OnboardingMemberGender,
} from '../lib/family/onboardingMember'
import type { FamilySession } from '../lib/familySession'
import { isStandaloneDisplayMode } from '../lib/pwaInstall'
import { FORM_FIELD_INPUT_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'
import { oneLineTextInputProps } from '../lib/formInputAutofill'

type CreateFamilyPanelProps = {
  onBack: () => void
}

type CreateState = {
  step: CreateOnboardingStep
  familyName: string
  displayName: string
  gender: OnboardingMemberGender
  ageInput: string
  recoveryCode: string
  pendingSession: FamilySession | null
  pwaInstallAcknowledged: boolean
}

const EMPTY_CREATE_STATE: CreateState = {
  step: 'form',
  familyName: '',
  displayName: '',
  gender: 'male',
  ageInput: '',
  recoveryCode: '',
  pendingSession: null,
  pwaInstallAcknowledged: false,
}

function createStateFromDraft(): CreateState {
  const draft = loadFamilyOnboardingDraft()
  if (draft?.mode !== 'create') return EMPTY_CREATE_STATE

  return {
    step: draft.step,
    familyName: draft.familyName,
    displayName: draft.displayName,
    gender: draft.gender,
    ageInput: draft.ageInput,
    recoveryCode: draft.recoveryCode ?? '',
    pendingSession: draft.pendingSession ?? null,
    pwaInstallAcknowledged: draft.pwaInstallAcknowledged === true,
  }
}

export default function CreateFamilyPanel({ onBack }: CreateFamilyPanelProps) {
  const router = useRouter()
  const { setSession } = useFamily()
  const draftHydratedRef = useRef(false)
  const standaloneInstallResumeRef = useRef(false)
  const [step, setStep] = useState<CreateOnboardingStep>('form')
  const [familyName, setFamilyName] = useState('')
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
      mode: 'create',
      step,
      familyName,
      displayName,
      gender,
      ageInput,
      pwaInstallAcknowledged,
      recoveryCode: recoveryCode || undefined,
      pendingSession: pendingSession ?? undefined,
    }
  }, [step, familyName, displayName, gender, ageInput, pwaInstallAcknowledged, recoveryCode, pendingSession])

  const persistDraft = useCallback(
    (patch?: Partial<Extract<FamilyOnboardingDraft, { mode: 'create' }>>) => {
      const draft = { ...buildDraft(), ...patch } as Extract<FamilyOnboardingDraft, { mode: 'create' }>
      persistFamilyOnboardingDraft(draft)
      flushOnboardingBridge()
    },
    [buildDraft],
  )

  const applyDraftSnapshot = useCallback((snapshot: CreateState) => {
    setStep((current) => mergeCreateStep(current, snapshot.step))
    setFamilyName(snapshot.familyName)
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
    if (draft?.mode !== 'create') return
    applyDraftSnapshot({
      step: draft.step,
      familyName: draft.familyName,
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
    applyDraftSnapshot(createStateFromDraft())
  }, [applyDraftSnapshot])

  useEffect(() => {
    persistFamilyOnboardingDraft(buildDraft())
  }, [buildDraft])

  const finishOnboarding = () => {
    if (pendingSession) {
      setSession(pendingSession)
    }
    clearFamilyOnboardingDraft()
    flushOnboardingBridge()
    router.replace('/')
    router.refresh()
  }

  const handleBack = () => {
    if (step === 'form') {
      clearFamilyOnboardingDraft()
      flushOnboardingBridge()
    }
    onBack()
  }

  const ensureFamilyCreated = async (): Promise<{ session: FamilySession; recoveryCode: string } | null> => {
    if (pendingSession && recoveryCode) {
      return { session: pendingSession, recoveryCode }
    }

    const age = parseAgeInput(ageInput)
    const { profile, error: profileError } = onboardingProfileFromForm({
      displayName,
      gender,
      age,
    })

    if (profileError || !profile) {
      setError(profileError ?? 'Profil unvollständig.')
      setStep('form')
      return null
    }

    setLoading(true)
    setError(null)
    const { result, error: createError } = await createFamilyWithMember(familyName, profile, {
      appInstalled: false,
      appLater: false,
    })
    setLoading(false)

    if (createError) {
      setError(createError.message)
      return null
    }
    if (!result) {
      setError('Familie konnte nicht angelegt werden.')
      return null
    }

    setPendingSession(result.session)
    setRecoveryCode(result.recoveryCode)
    persistDraft({
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

  const advanceToRecovery = async (prefs?: OnboardingDevicePrefs) => {
    const created = await ensureFamilyCreated()
    if (!created) return

    if (prefs) {
      await syncDevicePrefs(created.session, prefs)
    }

    setShowOpenPwaHint(false)
    setPwaInstallAcknowledged(true)
    persistDraft({
      step: 'recovery',
      pwaInstallAcknowledged: true,
      pendingSession: created.session,
      recoveryCode: created.recoveryCode,
    })
    setStep('recovery')
  }

  useEffect(() => {
    if (standaloneInstallResumeRef.current) return
    if (step !== 'install') return
    if (!isStandaloneDisplayMode()) return
    if (!pendingSession || !recoveryCode) return

    standaloneInstallResumeRef.current = true
    setShowOpenPwaHint(false)
    setPwaInstallAcknowledged(true)
    void syncDevicePrefs(pendingSession, { appInstalled: true, appLater: false }).finally(() => {
      persistDraft({ step: 'recovery', pwaInstallAcknowledged: true })
      setStep('recovery')
    })
  }, [step, pendingSession, recoveryCode, persistDraft])

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!familyName.trim()) {
      setError('Bitte einen Familiennamen eingeben.')
      return
    }

    const created = await ensureFamilyCreated()
    if (!created) return

    persistDraft({ step: 'install' })
    setStep('install')
  }

  const handleInstallDone = async () => {
    const created = await ensureFamilyCreated()
    if (!created) return

    setPwaInstallAcknowledged(true)
    persistDraft({ pwaInstallAcknowledged: true })

    if (isStandaloneDisplayMode()) {
      await advanceToRecovery({ appInstalled: true, appLater: false })
      return
    }

    setShowOpenPwaHint(true)
  }

  const handleInstallLater = () => {
    void advanceToRecovery({ appInstalled: false, appLater: true })
  }

  const handleContinueInBrowserFromPwaHint = () => {
    void advanceToRecovery({ appInstalled: true, appLater: false })
  }

  const handleCloseTabFromPwaHint = () => {
    persistDraft({ pwaInstallAcknowledged: true })
    flushOnboardingBridge()
    window.close()
  }

  const updateFamilyName = (value: string) => {
    setFamilyName(value)
    persistDraft({ familyName: value, hasStarted: true })
  }

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
            onClick={() => setStep('form')}
            className="text-sm font-semibold text-emerald-700 underline dark:text-emerald-300"
          >
            ← Zurück
          </button>
          {familyName.trim() ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Familie: <span className="font-semibold text-slate-900 dark:text-slate-100">{familyName.trim()}</span>
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

  if (step === 'recovery' && pendingSession && recoveryCode) {
    return (
      <OnboardingRecoveryStep
        recoveryCode={recoveryCode}
        session={pendingSession}
        onFinished={finishOnboarding}
      />
    )
  }

  return (
    <form onSubmit={(event) => void handleFormSubmit(event)} className="space-y-4">
      <button
        type="button"
        onClick={handleBack}
        className="text-sm font-semibold text-emerald-700 underline dark:text-emerald-300"
      >
        ← Zurück
      </button>
      <div>
        <label htmlFor="create-family-name" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Familienname
        </label>
        <input
          id="create-family-name"
          required
          maxLength={80}
          value={familyName}
          onChange={(e) => updateFamilyName(e.target.value)}
          placeholder="z. B. Familie Son"
          className={FORM_FIELD_INPUT_CLASS}
          {...oneLineTextInputProps('lifexp-create-family-name')}
        />
      </div>
      <OnboardingProfileFields
        displayName={displayName}
        onDisplayNameChange={setDisplayName}
        gender={gender}
        onGenderChange={setGender}
        ageInput={ageInput}
        onAgeInputChange={setAgeInput}
      />
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
        {loading ? 'Wird angelegt …' : 'Weiter'}
      </button>
    </form>
  )
}
