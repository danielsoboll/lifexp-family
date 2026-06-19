'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { notifyFamilyDataChanged } from './FamilyProvider'
import { createFamilyWithOwner } from '../lib/family/families'
import { CARD_SURFACE_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

export default function FamilySetupForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const { familyId, error: createError } = await createFamilyWithOwner(
      name,
      inviteCode.trim() || undefined,
    )

    setLoading(false)
    if (createError) {
      setError(createError.message)
      return
    }
    if (!familyId) {
      setError('Familie konnte nicht angelegt werden.')
      return
    }

    notifyFamilyDataChanged()
    router.replace('/')
    router.refresh()
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={`${CARD_SURFACE_CLASS} space-y-4 rounded-2xl p-5`}>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        Lege deine Familie an. Wir erstellen automatisch ein paar Start-Quests — du kannst später
        eigene hinzufügen.
      </p>
      <div>
        <label htmlFor="family-name" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Familienname
        </label>
        <input
          id="family-name"
          type="text"
          required
          maxLength={120}
          placeholder="z. B. Familie Soboll"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>
      <div>
        <label htmlFor="invite-code" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Einladungscode (optional)
        </label>
        <input
          id="invite-code"
          type="text"
          maxLength={40}
          placeholder="Für spätere Mitglieder"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>
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
        {loading ? 'Wird erstellt …' : 'Familie anlegen'}
      </button>
    </form>
  )
}
