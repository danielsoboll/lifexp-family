'use client'

import { useState } from 'react'

import RecoveryCodePanel from './RecoveryCodePanel'
import { updateMemberRecCodeOk } from '../lib/family/memberSettings'
import type { FamilySession } from '../lib/familySession'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type OnboardingRecoveryStepProps = {
  recoveryCode: string
  session: FamilySession
  onFinished: () => void
}

export default function OnboardingRecoveryStep({
  recoveryCode,
  session,
  onFinished,
}: OnboardingRecoveryStepProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDone = async () => {
    setSaving(true)
    setError(null)
    const { error: saveError } = await updateMemberRecCodeOk(
      session.memberKind,
      session.memberId,
      true,
    )
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    onFinished()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Dein Recovery-Code</h2>
      <RecoveryCodePanel
        code={recoveryCode}
        variant="onboarding"
        showDoneButton
        doneSaving={saving}
        onDone={() => void handleDone()}
      />
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onFinished}
        className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200 to-stone-400/80 px-4 py-3 text-sm font-bold text-stone-900 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-stone-100`}
      >
        Später sichern (Admin)
      </button>
    </div>
  )
}
