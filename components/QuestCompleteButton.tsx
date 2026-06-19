'use client'

import { useState } from 'react'

import { notifyFamilyDataChanged } from './FamilyProvider'
import { completeQuestForChild } from '../lib/family/questCompletions'
import { questAppliesToChild } from '../lib/family/quests'
import type { Quest } from '../lib/family/types'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type QuestCompleteButtonProps = {
  quest: Quest
  childId: string
  childName: string
  familyId: string
  disabled?: boolean
  onCompleted?: () => void
}

export default function QuestCompleteButton({
  quest,
  childId,
  childName,
  familyId,
  disabled = false,
  onCompleted,
}: QuestCompleteButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(disabled)

  if (!questAppliesToChild(quest, childId)) return null

  const handleClick = async () => {
    if (loading || done) return
    setLoading(true)
    setError(null)
    const { error: completeError } = await completeQuestForChild({
      quest,
      childId,
      familyId,
    })
    setLoading(false)
    if (completeError) {
      setError(completeError.message)
      return
    }
    setDone(true)
    notifyFamilyDataChanged()
    onCompleted?.()
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={loading || done}
        onClick={() => void handleClick()}
        className={`${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 px-3 py-2 text-sm font-semibold disabled:opacity-60 ${
          done
            ? 'border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
            : 'border-stone-400 bg-gradient-to-b from-stone-100 to-stone-300 text-stone-900 dark:border-stone-600 dark:from-stone-700 dark:to-stone-900 dark:text-stone-100'
        }`}
      >
        {done ? `✓ ${childName} erledigt` : loading ? 'Wird gespeichert …' : `${childName}: +${quest.xp_reward} XP`}
      </button>
      {error ? <p className="text-xs text-red-600 dark:text-red-300">{error}</p> : null}
    </div>
  )
}
