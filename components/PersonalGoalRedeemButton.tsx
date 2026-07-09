'use client'

import { useState } from 'react'

import { notifyFamilyDataChanged } from './FamilyProvider'
import { redeemMemberPersonalGoal } from '../lib/family/personalGoals'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type PersonalGoalRedeemButtonProps = {
  familyId: string
  memberKind: 'parent' | 'child'
  memberId: string
  goalId: string
  compact?: boolean
  onRedeemed?: () => void
}

export default function PersonalGoalRedeemButton({
  familyId,
  memberKind,
  memberId,
  goalId,
  compact = false,
  onRedeemed,
}: PersonalGoalRedeemButtonProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRedeem = async () => {
    setBusy(true)
    setError(null)
    const { error: redeemError } = await redeemMemberPersonalGoal({
      familyId,
      member: { memberKind, memberId },
      goalId,
    })
    setBusy(false)
    if (redeemError) {
      setError(redeemError.message)
      return
    }
    notifyFamilyDataChanged()
    onRedeemed?.()
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleRedeem()}
        className={`${PRESSABLE_3D_CLASS} ${compact ? 'mt-2.5' : 'mt-3'} w-full rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-60`}
      >
        {busy ? 'Wird gespeichert …' : 'Erledigt'}
      </button>
      {error ? <p className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p> : null}
    </div>
  )
}
