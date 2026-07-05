'use client'

import { useState } from 'react'

import { notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import { markPlusDiscoverUnlocked } from '../lib/family/plusDiscoverUnlock'
import { confirmQuestByCreator } from '../lib/family/questCompletions'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type QuestFinalConfirmButtonProps = {
  completionId: string
  xpReward: number
  assigneeName?: string
  compact?: boolean
  onConfirmed?: () => void
}

export default function QuestFinalConfirmButton({
  completionId,
  xpReward,
  assigneeName,
  compact = false,
  onConfirmed,
}: QuestFinalConfirmButtonProps) {
  const { family } = useFamily()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setBusy(true)
    setError(null)
    const { error: confirmError } = await confirmQuestByCreator(completionId)
    setBusy(false)
    if (confirmError) {
      setError(confirmError.message)
      return
    }
    if (family?.id) markPlusDiscoverUnlocked(family.id)
    notifyFamilyDataChanged()
    onConfirmed?.()
  }

  const label = assigneeName
    ? `Final bestätigen (+${xpReward} XP für ${assigneeName})`
    : `Final bestätigen (+${xpReward} XP)`

  return (
    <div className={compact ? 'mt-2' : 'mt-2.5'}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleConfirm()}
        className={`${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-60`}
      >
        {busy ? 'Wird bestätigt …' : label}
      </button>
      {error ? (
        <p className="mt-1.5 text-xs text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
