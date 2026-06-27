'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { notifyFamilyDataChanged, useFamily } from '@/components/FamilyProvider'
import { useBillingReturnRecovery } from '@/hooks/useBillingReturnRecovery'
import { BILLING_RETURN_TARGET_PATH } from '@/lib/family/billingReturn'
import { isFamilyPlus } from '@/lib/family/familyPlus'
import { FAMILY_PLUS_TAGLINE } from '@/lib/family/familyPlusFeatures'
import { CARD_SURFACE_CLASS, HOME_PAGE_INSET_CLASS, MAIN_SHELL_CLASS, PRESSABLE_3D_CLASS } from '@/lib/appShell'

export default function PlusSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const { family, refresh } = useFamily()
  const [polls, setPolls] = useState(0)

  const { bootstrapped, recovering, hasSession: sessionActive, loading: recoveryLoading } =
    useBillingReturnRecovery({
      redirectWhenReady: false,
      stripeSessionId: sessionId,
    })

  const waiting = !bootstrapped || recovering || recoveryLoading

  useEffect(() => {
    if (waiting || !sessionActive) return
    void refresh().then(() => notifyFamilyDataChanged())
  }, [waiting, sessionActive, refresh])

  useEffect(() => {
    if (waiting || !sessionActive) return
    if (isFamilyPlus(family) || polls >= 8) return
    const timer = window.setTimeout(() => {
      setPolls((count) => count + 1)
      void refresh().then(() => notifyFamilyDataChanged())
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [waiting, sessionActive, family, polls, refresh])

  useEffect(() => {
    if (waiting || !sessionActive) return
    const plusReady = isFamilyPlus(family)
    const pollsDone = polls >= 8
    if (!plusReady && !pollsDone) return
    const timer = window.setTimeout(() => {
      router.replace(BILLING_RETURN_TARGET_PATH)
    }, plusReady ? 400 : 800)
    return () => window.clearTimeout(timer)
  }, [waiting, sessionActive, family, polls, router])

  if (bootstrapped && !recovering && !recoveryLoading && !sessionActive) {
    return (
      <main className={`${MAIN_SHELL_CLASS} ${HOME_PAGE_INSET_CLASS} mx-auto flex w-full max-w-lg flex-col gap-4 px-4`}>
        <div className={`${CARD_SURFACE_CLASS} rounded-2xl p-5`}>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Sitzung nicht gefunden</h1>
          <p className="mt-2 text-sm text-slate-950 dark:text-slate-300">
            Die Zahlung war erfolgreich — bitte mit deinem Recovery-Code wieder verbinden. PLUS wird danach automatisch
            aktiv.
          </p>
          <button
            type="button"
            onClick={() => router.replace('/')}
            className={`${PRESSABLE_3D_CLASS} mt-5 w-full rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-400 to-emerald-600 px-4 py-3 text-sm font-bold text-white`}
          >
            Zur Startseite
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className={`${MAIN_SHELL_CLASS} ${HOME_PAGE_INSET_CLASS} mx-auto flex w-full max-w-lg flex-col gap-4 px-4`}>
      <div className={`${CARD_SURFACE_CLASS} rounded-2xl p-5`}>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Danke — PLUS wird aktiviert</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-950 dark:text-slate-300">{FAMILY_PLUS_TAGLINE}</p>
        <p className="mt-3 text-sm text-slate-950 dark:text-slate-300">
          Stripe hat die Zahlung angenommen. Wir synchronisieren jetzt euer Familien-Abo
          {sessionId ? ' …' : '.'}
        </p>
        <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          {waiting
            ? 'Familie wird wieder verbunden …'
            : isFamilyPlus(family)
              ? 'LifeXP Family PLUS ist aktiv.'
              : 'Weiterleitung zu den Einstellungen …'}
        </p>
        {!waiting ? (
          <button
            type="button"
            onClick={() => router.replace(BILLING_RETURN_TARGET_PATH)}
            className={`${PRESSABLE_3D_CLASS} mt-5 w-full rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-400 to-emerald-600 px-4 py-3 text-sm font-bold text-white`}
          >
            Zu den Einstellungen
          </button>
        ) : null}
      </div>
    </main>
  )
}
