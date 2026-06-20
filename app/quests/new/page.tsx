'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import MemberSingleSelect from '../../../components/MemberSingleSelect'
import QuestDayToggle from '../../../components/QuestDayToggle'
import QuestXpSlider from '../../../components/QuestXpSlider'
import { notifyFamilyDataChanged, useFamily } from '../../../components/FamilyProvider'
import PageHeaderBar from '../../../components/PageHeaderBar'
import { createQuest } from '../../../lib/family/quests'
import type { QuestAssignee } from '../../../lib/family/types'
import {
  QUEST_XP_HIGH_CONFIRM_THRESHOLD,
  questDayChoiceToDateKey,
  type QuestDayChoice,
} from '../../../lib/family/questRules'
import { fetchMemberXpBudget } from '../../../lib/family/questXpBudget'
import { CARD_SURFACE_CLASS, MAIN_PAGE_INSET_CLASS, MAIN_SHELL_CLASS, PRESSABLE_3D_CLASS } from '../../../lib/appShell'

export default function NewQuestPage() {
  const router = useRouter()
  const { family, parents, children, memberKind, parent, activeChild } = useFamily()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [xpReward, setXpReward] = useState(3)
  const [dayChoice, setDayChoice] = useState<QuestDayChoice>('today')
  const [assignee, setAssignee] = useState<QuestAssignee | null>(null)
  const [remainingXp, setRemainingXp] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const excludeMember = useMemo((): QuestAssignee | null => {
    if (memberKind === 'parent' && parent) return { type: 'parent', id: parent.id }
    if (memberKind === 'child' && activeChild) return { type: 'child', id: activeChild.id }
    return null
  }, [memberKind, parent, activeChild])

  const taskDate = questDayChoiceToDateKey(dayChoice)
  const maxSliderXp = remainingXp === null ? 10 : Math.min(10, Math.max(1, remainingXp))

  useEffect(() => {
    if (!family || !assignee) {
      setRemainingXp(null)
      return
    }
    let cancelled = false
    void (async () => {
      const { budget, error: budgetError } = await fetchMemberXpBudget({
        familyId: family.id,
        memberType: assignee.type,
        memberId: assignee.id,
        taskDate,
      })
      if (cancelled) return
      if (budgetError) {
        setRemainingXp(null)
        return
      }
      setRemainingXp(budget.remainingXp)
      setXpReward((prev) => Math.min(prev, Math.max(1, Math.min(10, budget.remainingXp))))
    })()
    return () => {
      cancelled = true
    }
  }, [family, assignee, taskDate])

  if (!family) return null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!assignee) {
      setError('Bitte ein Familienmitglied auswählen — nicht dich selbst.')
      return
    }

    if (xpReward >= QUEST_XP_HIGH_CONFIRM_THRESHOLD) {
      const ok = window.confirm('Ist dir das wirklich so wichtig?')
      if (!ok) return
    }

    setLoading(true)
    setError(null)

    const { error: createError } = await createQuest({
      familyId: family.id,
      title,
      description,
      xpReward,
      taskDate,
      assignee,
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
      <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Quest eintragen</h1>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Für ein anderes Familienmitglied — heute oder morgen, max. 10 XP pro Quest und 30 XP pro Tag.
      </p>
      <form onSubmit={(e) => void handleSubmit(e)} className={`${CARD_SURFACE_CLASS} space-y-4 rounded-2xl p-5`}>
        <MemberSingleSelect
          parents={parents}
          children={children}
          value={assignee}
          onChange={setAssignee}
          excludeMember={excludeMember}
        />
        <QuestDayToggle value={dayChoice} onChange={setDayChoice} />
        <div>
          <label htmlFor="quest-title" className="mb-1 block text-sm font-semibold">
            Was soll gemacht werden?
          </label>
          <input
            id="quest-title"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z. B. Zimmer aufräumen"
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
          />
        </div>
        <div>
          <label htmlFor="quest-desc" className="mb-1 block text-sm font-semibold">
            Notiz (optional)
          </label>
          <textarea
            id="quest-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
          />
        </div>
        <QuestXpSlider
          value={xpReward}
          onChange={setXpReward}
          maxAllowed={maxSliderXp}
          disabled={assignee !== null && remainingXp === 0}
        />
        {assignee && remainingXp !== null ? (
          <p className="text-xs text-slate-600 dark:text-slate-400">
            An dem Tag sind für diese Person noch <strong>{remainingXp} XP</strong> frei (max. 30 pro Tag).
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading || !assignee || remainingXp === 0}
          className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 font-bold text-white disabled:opacity-60`}
        >
          {loading ? 'Wird gespeichert …' : 'Quest eintragen'}
        </button>
      </form>
    </main>
  )
}
