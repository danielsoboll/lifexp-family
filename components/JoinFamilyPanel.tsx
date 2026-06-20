'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import OnboardingProfileFields from './OnboardingProfileFields'
import QrCodeScanner from './QrCodeScanner'
import { useFamily } from './FamilyProvider'
import { joinFamilyWithInviteCode } from '../lib/family/families'
import { parseAgeInput } from '../lib/family/memberGender'
import { onboardingProfileFromForm, type OnboardingMemberGender } from '../lib/family/onboardingMember'
import { normalizeInviteCodeInput, parseInviteCodeFromQr } from '../lib/parseInviteCode'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type JoinStep = 'choice' | 'code' | 'scan' | 'confirm'

type JoinFamilyPanelProps = {
  onBack: () => void
}

export default function JoinFamilyPanel({ onBack }: JoinFamilyPanelProps) {
  const router = useRouter()
  const { setSession } = useFamily()
  const [step, setStep] = useState<JoinStep>('choice')
  const [inviteCode, setInviteCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [gender, setGender] = useState<OnboardingMemberGender>('male')
  const [ageInput, setAgeInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submitJoin = async (code: string) => {
    setLoading(true)
    setError(null)

    const age = parseAgeInput(ageInput)
    const { profile, error: profileError } = onboardingProfileFromForm({
      displayName,
      gender,
      age,
    })

    if (profileError || !profile) {
      setLoading(false)
      setError(profileError ?? 'Profil unvollständig.')
      return
    }

    const { result, error: joinError } = await joinFamilyWithInviteCode(code, profile)

    setLoading(false)
    if (joinError) {
      setError(joinError.message)
      return
    }
    if (!result) {
      setError('Verbindung fehlgeschlagen.')
      return
    }

    setSession(result)
    router.replace('/')
    router.refresh()
  }

  const handleCodeSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    await submitJoin(normalizeInviteCodeInput(inviteCode))
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

  if (step === 'choice') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
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
      <form onSubmit={(e) => void handleCodeSubmit(e)} className="space-y-4">
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
          className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-bold text-white disabled:opacity-60`}
        >
          {loading ? 'Verbinden …' : 'Familie verbinden'}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={(e) => void handleCodeSubmit(e)} className="space-y-4">
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
          type="text"
          required
          maxLength={40}
          autoComplete="off"
          spellCheck={false}
          placeholder="z. B. ABCD-1234"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 font-mono text-slate-900 uppercase dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
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
        className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-bold text-white disabled:opacity-60`}
      >
        {loading ? 'Verbinden …' : 'Familie verbinden'}
      </button>
    </form>
  )
}
