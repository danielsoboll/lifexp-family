'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { notifyFamilyDataChanged, useFamily } from '../../../components/FamilyProvider'
import PageHeaderBar from '../../../components/PageHeaderBar'
import { createQuest } from '../../../lib/family/quests'
import { CARD_SURFACE_CLASS, MAIN_PAGE_INSET_CLASS, MAIN_SHELL_CLASS, PRESSABLE_3D_CLASS } from '../../../lib/appShell'
import type { QuestRecurrence } from '../../../lib/family/types'

export default function NewQuestPage() {
  const router = useRouter()
  const { family } = useFamily()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [xpReward, setXpReward] = useState('10')
  const [category, setCategory] = useState('allgemein')
  const [recurrence, setRecurrence] = useState<QuestRecurrence>('daily')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!family) return null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const xp = parseInt(xpReward, 10)
    const { error: createError } = await createQuest({
      familyId: family.id,
      title,
      description,
      xpReward: Number.isFinite(xp) ? xp : 0,
      category,
      recurrence,
    })

    setLoading(false)
    if (createError) {
      setError(createError.message)
      return
    }

    notifyFamilyDataChanged()
    router.push('/quests')
  }

  return (
    <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto w-full max-w-lg px-4`}>
      <PageHeaderBar backHref="/quests" backLabel="Quests" />
      <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">Neue Quest</h1>
      <form onSubmit={(e) => void handleSubmit(e)} className={`${CARD_SURFACE_CLASS} space-y-4 rounded-2xl p-5`}>
        <div>
          <label htmlFor="quest-title" className="mb-1 block text-sm font-semibold">Titel</label>
          <input
            id="quest-title"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
          />
        </div>
        <div>
          <label htmlFor="quest-desc" className="mb-1 block text-sm font-semibold">Beschreibung</label>
          <textarea
            id="quest-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="quest-xp" className="mb-1 block text-sm font-semibold">XP-Belohnung</label>
            <input
              id="quest-xp"
              type="number"
              min={1}
              required
              value={xpReward}
              onChange={(e) => setXpReward(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
            />
          </div>
          <div>
            <label htmlFor="quest-category" className="mb-1 block text-sm font-semibold">Kategorie</label>
            <input
              id="quest-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
            />
          </div>
        </div>
        <div>
          <label htmlFor="quest-recurrence" className="mb-1 block text-sm font-semibold">Wiederholung</label>
          <select
            id="quest-recurrence"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as QuestRecurrence)}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
          >
            <option value="daily">Täglich</option>
            <option value="weekly">Wöchentlich</option>
            <option value="once">Einmalig</option>
          </select>
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
          {loading ? 'Wird gespeichert …' : 'Quest speichern'}
        </button>
      </form>
    </main>
  )
}
