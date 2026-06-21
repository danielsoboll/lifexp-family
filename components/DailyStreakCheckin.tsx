'use client'

import { useEffect, useState } from 'react'

import FlowHintArrow from './FlowHintArrow'
import { notifyFamilyDataChanged } from './FamilyProvider'
import { claimMemberDailyStreak, DAILY_STREAK_XP } from '../lib/family/dailyStreak'
import type { FamilySessionMemberKind } from '../lib/familySession'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type DailyStreakCheckinProps = {
  familyId: string
  memberKind: FamilySessionMemberKind
  memberId: string
  claimed: boolean
  onClaimed?: () => void
  /** Volle Breite unter dem Portrait auf der Detailseite. */
  layout?: 'compact' | 'detail'
}

export default function DailyStreakCheckin({
  familyId,
  memberKind,
  memberId,
  claimed,
  onClaimed,
  layout = 'compact',
}: DailyStreakCheckinProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localClaimed, setLocalClaimed] = useState(claimed)

  useEffect(() => {
    setLocalClaimed(claimed)
  }, [claimed])

  const done = localClaimed || claimed
  const detail = layout === 'detail'

  const handleClaim = async () => {
    if (done || busy) return
    setBusy(true)
    setError(null)
    const { error: claimError } = await claimMemberDailyStreak({ familyId, memberKind, memberId })
    setBusy(false)
    if (claimError) {
      setError(claimError.message)
      return
    }
    setLocalClaimed(true)
    notifyFamilyDataChanged()
    onClaimed?.()
  }

  return (
    <div className={`flex flex-col items-center ${detail ? 'mt-2 w-full' : 'mb-1'}`}>
      {!done ? (
        <div className="lifexp-streak-hint mb-0.5" aria-hidden>
          <span className="rounded-full border-2 border-yellow-300 bg-yellow-50/90 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-950 dark:border-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-100">
            Streak
          </span>
          <FlowHintArrow />
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => void handleClaim()}
        disabled={done || busy}
        className={`${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 px-2 py-1.5 text-left disabled:cursor-default disabled:opacity-95 ${
          detail ? 'max-w-none py-2.5' : 'max-w-[11rem]'
        } ${
          done
            ? 'border-emerald-400 bg-gradient-to-b from-emerald-50 to-teal-100 dark:border-emerald-600 dark:from-emerald-950/50 dark:to-teal-950/40'
            : 'border-yellow-300 bg-gradient-to-b from-yellow-50 via-amber-50/95 to-yellow-200/75 dark:border-yellow-700 dark:from-yellow-950/45 dark:via-amber-950/35 dark:to-yellow-900/50'
        }`}
      >
        <span className={`block font-bold text-slate-900 dark:text-slate-100 ${detail ? 'text-sm' : 'text-xs'}`}>
          {done ? 'Heute dabei!' : busy ? 'Speichern …' : 'Heute dabei'}
        </span>
        {!done ? (
          <span className={`mt-0.5 block font-semibold text-emerald-700 dark:text-emerald-300 ${detail ? 'text-xs' : 'text-[10px]'}`}>
            +{DAILY_STREAK_XP} XP
          </span>
        ) : null}
      </button>
      {error ? (
        <p className={`mt-1 text-center text-red-600 dark:text-red-300 ${detail ? 'max-w-none text-xs' : 'max-w-[11rem] text-[10px]'}`}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
