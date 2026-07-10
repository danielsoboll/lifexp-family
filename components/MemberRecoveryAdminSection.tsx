'use client'

import { useState } from 'react'

import PwaInstallPanel from './PwaInstallPanel'
import RecoveryCodePanel from './RecoveryCodePanel'
import { notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import { updateMemberAppInstalled, updateMemberRecCodeOk } from '../lib/family/memberSettings'
import { CARD_SURFACE_CLASS } from '../lib/appShell'
import type { FamilySessionMemberKind } from '../lib/familySession'

type MemberRecoveryAdminSectionProps = {
  memberKind: FamilySessionMemberKind
  memberId: string
  recCode: string | null
  recCodeOk: boolean
  appInstalled: boolean
  appLater: boolean
}

export default function MemberRecoveryAdminSection({
  memberKind,
  memberId,
  recCode,
  recCodeOk,
  appInstalled,
  appLater,
}: MemberRecoveryAdminSectionProps) {
  const { refresh } = useFamily()
  const [recSaving, setRecSaving] = useState(false)
  const [installSaving, setInstallSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRecDone = async () => {
    setRecSaving(true)
    setError(null)
    const { error: saveError } = await updateMemberRecCodeOk(memberKind, memberId, true)
    setRecSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    notifyFamilyDataChanged()
    await refresh()
  }

  const handleInstallDone = async () => {
    setInstallSaving(true)
    setError(null)
    const { error: saveError } = await updateMemberAppInstalled(memberKind, memberId, true)
    setInstallSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    notifyFamilyDataChanged()
    await refresh()
  }

  return (
    <section className={`${CARD_SURFACE_CLASS} space-y-4 rounded-xl p-3`}>
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">App & Recovery</h3>
        <p className="mt-0.5 text-xs text-slate-950 dark:text-slate-400">
          Home-Bildschirm: {appInstalled ? 'installiert' : appLater ? 'später' : 'offen'}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-950 dark:text-slate-300">Zum Home-Bildschirm</p>
        <PwaInstallPanel
          prominent
          showIosDoneButton
          iosInstallConfirmed={appInstalled}
          iosDoneSaving={installSaving}
          onIosDone={() => void handleInstallDone()}
          onInstalled={() => void handleInstallDone()}
        />
      </div>

      {recCode ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-950 dark:text-slate-300">Recovery-Code</p>
          <RecoveryCodePanel
            code={recCode}
            variant="settings"
            recCodeOk={recCodeOk}
            hideDoneStatus
            showDoneButton={!recCodeOk}
            doneSaving={recSaving}
            onDone={() => void handleRecDone()}
          />
        </div>
      ) : (
        <p className="text-xs text-slate-950 dark:text-slate-400">Kein Recovery-Code hinterlegt.</p>
      )}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
    </section>
  )
}
