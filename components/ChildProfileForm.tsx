'use client'

import { useState } from 'react'

import { notifyFamilyDataChanged } from './FamilyProvider'
import { createChild } from '../lib/family/children'
import { CARD_SURFACE_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

type ChildProfileFormProps = {
  familyId: string
  onCreated?: () => void
}

export default function ChildProfileForm({ familyId, onCreated }: ChildProfileFormProps) {
  const [displayName, setDisplayName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [avatarKey, setAvatarKey] = useState<'default' | 'boy' | 'girl'>('default')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const year = birthYear.trim() ? parseInt(birthYear, 10) : null
    const { error: createError } = await createChild({
      familyId,
      displayName,
      birthYear: Number.isFinite(year) ? year : null,
      avatarKey,
    })

    setLoading(false)
    if (createError) {
      setError(createError.message)
      return
    }

    setDisplayName('')
    setBirthYear('')
    setAvatarKey('default')
    notifyFamilyDataChanged()
    onCreated?.()
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={`${CARD_SURFACE_CLASS} space-y-4 rounded-2xl p-5`}>
      <div>
        <label htmlFor="child-name" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Name des Kindes
        </label>
        <input
          id="child-name"
          type="text"
          required
          maxLength={80}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
        />
      </div>
      <div>
        <label htmlFor="child-year" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Geburtsjahr (optional)
        </label>
        <input
          id="child-year"
          type="number"
          min={1900}
          max={2100}
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value)}
          className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
        />
      </div>
      <div>
        <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Avatar</span>
        <div className="flex gap-2">
          {([
            ['default', '⭐'],
            ['boy', '👦'],
            ['girl', '👧'],
          ] as const).map(([key, emoji]) => (
            <button
              key={key}
              type="button"
              onClick={() => setAvatarKey(key)}
              className={`rounded-xl border-2 px-4 py-2 text-xl ${
                avatarKey === key
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 font-bold text-white disabled:opacity-60`}
      >
        {loading ? 'Wird gespeichert …' : 'Kind anlegen'}
      </button>
    </form>
  )
}
