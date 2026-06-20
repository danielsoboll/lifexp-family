'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import OnboardingProfileFields from './OnboardingProfileFields'
import { useFamily } from './FamilyProvider'
import { createFamilyWithMember } from '../lib/family/families'
import { parseAgeInput } from '../lib/family/memberGender'
import { onboardingProfileFromForm, type OnboardingMemberGender } from '../lib/family/onboardingMember'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type CreateFamilyPanelProps = {
  onBack: () => void
}

export default function CreateFamilyPanel({ onBack }: CreateFamilyPanelProps) {
  const router = useRouter()
  const { setSession } = useFamily()
  const [familyName, setFamilyName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [gender, setGender] = useState<OnboardingMemberGender>('male')
  const [ageInput, setAgeInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
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

    const { result, error: createError } = await createFamilyWithMember(familyName, profile)

    setLoading(false)
    if (createError) {
      setError(createError.message)
      return
    }
    if (!result) {
      setError('Familie konnte nicht angelegt werden.')
      return
    }

    setSession(result)
    router.replace('/')
    router.refresh()
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <button
        type="button"
        onClick={onBack}
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
          type="text"
          required
          maxLength={80}
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          placeholder="z. B. Familie Son"
          className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
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
        className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-bold text-white disabled:opacity-60`}
      >
        {loading ? 'Wird angelegt …' : 'Familie anlegen'}
      </button>
    </form>
  )
}
