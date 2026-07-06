'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import PageHeaderBar from '../../../components/PageHeaderBar'
import RecoveryCodePanel from '../../../components/RecoveryCodePanel'
import { notifyFamilyDataChanged, useFamily } from '../../../components/FamilyProvider'
import { fetchMemberDeviceSettings, updateMemberRecCodeOk } from '../../../lib/family/memberSettings'
import { readFamilySession } from '../../../lib/familySession'
import { CARD_SURFACE_CLASS, MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS } from '../../../lib/appShell'

export default function WasJetztTunRecoveryPage() {
  const router = useRouter()
  const { refresh } = useFamily()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recCode, setRecCode] = useState<string | null>(null)
  const [recCodeOk, setRecCodeOk] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void (async () => {
      const session = readFamilySession()
      if (!session) {
        setLoading(false)
        setError('Bitte zuerst anmelden.')
        return
      }

      const settings = await fetchMemberDeviceSettings(session.memberKind, session.memberId)
      setLoading(false)
      if (settings.error) {
        setError(settings.error.message)
        return
      }

      setRecCode(settings.recCode)
      setRecCodeOk(settings.recCodeOk)

      if (settings.recCodeOk || !settings.recCode) {
        router.replace('/was-jetzt-tun')
      }
    })()
  }, [router])

  const handleDone = async () => {
    const session = readFamilySession()
    if (!session) return

    setSaving(true)
    setError(null)
    const { error: saveError } = await updateMemberRecCodeOk(session.memberKind, session.memberId, true)
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }

    notifyFamilyDataChanged()
    await refresh()
    router.replace('/was-jetzt-tun')
  }

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <PageHeaderBar backHref="/was-jetzt-tun" backLabel="Was jetzt tun?" />

        <header className="mb-4">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Recovery-Code sichern</h1>
          <p className="mt-1 text-sm text-slate-950 dark:text-slate-400">
            Einmal bestätigen — danach erinnern wir dich nicht mehr daran.
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-slate-950 dark:text-slate-400">Laden …</p>
        ) : recCode ? (
          <div className={`${CARD_SURFACE_CLASS} space-y-3 rounded-xl p-3`}>
            <RecoveryCodePanel
              code={recCode}
              variant="onboarding"
              recCodeOk={recCodeOk}
              showDoneButton={!recCodeOk}
              doneSaving={saving}
              onDone={() => void handleDone()}
            />
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}

        <div className="min-h-[max(3rem,env(safe-area-inset-bottom))] shrink-0" aria-hidden />
      </div>
    </main>
  )
}
