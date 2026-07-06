'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { notifyFamilyDataChanged, useFamily } from '@/components/FamilyProvider'
import { useBillingReturnRecovery } from '@/hooks/useBillingReturnRecovery'
import { BILLING_CANCEL_PATH, BILLING_RETURN_TARGET_PATH } from '@/lib/family/billingReturn'
import { FAMILY_PLUS_TAGLINE } from '@/lib/family/familyPlusFeatures'
import { syncPlusBillingFromStripe } from '@/lib/family/stripeBilling'
import { CARD_SURFACE_CLASS, HOME_PAGE_INSET_CLASS, MAIN_SHELL_CLASS, PRESSABLE_3D_CLASS } from '@/lib/appShell'
import { QUICK_CLICK_WAIT_HINT } from '@/lib/quickClickFeedback'

export default function PlusSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const { family, refresh } = useFamily()
  const [polls, setPolls] = useState(0)
  const [syncBusy, setSyncBusy] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const {
    bootstrapped,
    recovering,
    hasSession: sessionActive,
    loading: recoveryLoading,
    checkoutVerification,
    plusSyncedFromStripe,
    verificationError,
    plusActive,
  } = useBillingReturnRecovery({
    redirectWhenReady: false,
    stripeSessionId: sessionId,
    verifyCheckout: true,
  })

  const waiting = !bootstrapped || recovering || recoveryLoading || checkoutVerification === 'pending'
  const paymentConfirmed = checkoutVerification === 'paid'
  const plusReady = paymentConfirmed && plusActive

  useEffect(() => {
    if (waiting || !sessionActive || !paymentConfirmed) return
    void refresh().then(() => notifyFamilyDataChanged())
  }, [waiting, sessionActive, paymentConfirmed, refresh])

  useEffect(() => {
    if (waiting || !sessionActive || !paymentConfirmed || plusReady) return
    if (polls >= 10) return
    const timer = window.setTimeout(() => {
      setPolls((count) => count + 1)
      void refresh().then(() => notifyFamilyDataChanged())
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [waiting, sessionActive, paymentConfirmed, plusReady, polls, refresh])

  useEffect(() => {
    if (!plusReady) return
    const timer = window.setTimeout(() => {
      router.replace(BILLING_RETURN_TARGET_PATH)
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [plusReady, router])

  const handleManualSync = async () => {
    if (!family?.id || syncBusy) return
    setSyncBusy(true)
    setSyncError(null)
    try {
      await syncPlusBillingFromStripe(family.id)
      await refresh()
      notifyFamilyDataChanged()
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Synchronisation fehlgeschlagen.')
    } finally {
      setSyncBusy(false)
    }
  }

  if (waiting) {
    return (
      <main className={`${MAIN_SHELL_CLASS} ${HOME_PAGE_INSET_CLASS} mx-auto flex w-full max-w-lg flex-col gap-4 px-4`}>
        <div className={`${CARD_SURFACE_CLASS} rounded-2xl p-5`}>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Zahlung wird geprüft …</h1>
          <p className="mt-2 text-sm text-slate-950 dark:text-slate-300">{QUICK_CLICK_WAIT_HINT}</p>
        </div>
      </main>
    )
  }

  if (checkoutVerification === 'missing_session') {
    return (
      <main className={`${MAIN_SHELL_CLASS} ${HOME_PAGE_INSET_CLASS} mx-auto flex w-full max-w-lg flex-col gap-4 px-4`}>
        <div className={`${CARD_SURFACE_CLASS} rounded-2xl p-5`}>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Kein Checkout gefunden</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-950 dark:text-slate-300">
            Diese Seite funktioniert nur nach einem abgeschlossenen Stripe-Checkout. PLUS wurde nicht aktiviert.
          </p>
          <button
            type="button"
            onClick={() => router.replace(BILLING_RETURN_TARGET_PATH)}
            className={`${PRESSABLE_3D_CLASS} mt-5 w-full rounded-xl border-2 border-slate-400 bg-gradient-to-b from-slate-100 to-slate-300 px-4 py-3 text-sm font-bold text-slate-900 dark:border-slate-600 dark:from-slate-700 dark:to-slate-900 dark:text-slate-100`}
          >
            Zu den Einstellungen
          </button>
        </div>
      </main>
    )
  }

  if (checkoutVerification === 'unpaid' || checkoutVerification === 'error') {
    return (
      <main className={`${MAIN_SHELL_CLASS} ${HOME_PAGE_INSET_CLASS} mx-auto flex w-full max-w-lg flex-col gap-4 px-4`}>
        <div className={`${CARD_SURFACE_CLASS} rounded-2xl p-5`}>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">PLUS nicht aktiviert</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-950 dark:text-slate-300">{FAMILY_PLUS_TAGLINE}</p>
          <p className="mt-3 text-sm text-slate-950 dark:text-slate-300">
            {verificationError ??
              'Bei Stripe ist keine abgeschlossene Zahlung hinterlegt. Ohne Zahlung bleibt PLUS aus.'}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => router.replace(BILLING_CANCEL_PATH)}
              className={`${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 border-slate-400 bg-gradient-to-b from-slate-100 to-slate-300 px-4 py-3 text-sm font-bold text-slate-900 dark:border-slate-600 dark:from-slate-700 dark:to-slate-900 dark:text-slate-100`}
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={() => router.replace(BILLING_RETURN_TARGET_PATH)}
              className={`${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 border-amber-500 bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-3 text-sm font-bold text-amber-950`}
            >
              PLUS erneut versuchen
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (bootstrapped && !recovering && !recoveryLoading && !sessionActive) {
    return (
      <main className={`${MAIN_SHELL_CLASS} ${HOME_PAGE_INSET_CLASS} mx-auto flex w-full max-w-lg flex-col gap-4 px-4`}>
        <div className={`${CARD_SURFACE_CLASS} rounded-2xl p-5`}>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Zahlung bestätigt — Sitzung fehlt</h1>
          <p className="mt-2 text-sm text-slate-950 dark:text-slate-300">
            Stripe meldet eine abgeschlossene Zahlung. Bitte mit deinem Recovery-Code wieder verbinden — danach PLUS in
            den Einstellungen prüfen.
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
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {plusReady ? 'Danke — PLUS ist aktiv' : 'Zahlung bestätigt — PLUS wird eingerichtet'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-950 dark:text-slate-300">{FAMILY_PLUS_TAGLINE}</p>
        <p className="mt-3 text-sm text-slate-950 dark:text-slate-300">
          {plusReady
            ? 'Stripe und euer Familien-Abo sind synchron.'
            : plusSyncedFromStripe
              ? 'Stripe ist synchron — PLUS erscheint gleich in der App.'
              : 'Wir warten auf die Bestätigung von Stripe (Webhook). Das kann ein paar Sekunden dauern.'}
        </p>
        <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          {plusReady
            ? 'LifeXP Family PLUS ist freigeschaltet.'
            : polls >= 10
              ? 'PLUS ist noch nicht sichtbar — bitte Status manuell holen.'
              : 'Einen Moment …'}
        </p>

        {syncError ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {syncError}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          {!plusReady ? (
            <button
              type="button"
              disabled={syncBusy || !family?.id}
              onClick={() => void handleManualSync()}
              className={`${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 border-amber-500 bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-3 text-sm font-bold text-amber-950 disabled:opacity-60`}
            >
              {syncBusy ? QUICK_CLICK_WAIT_HINT : 'Status von Stripe holen'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => router.replace(BILLING_RETURN_TARGET_PATH)}
            className={`${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 border-slate-400 bg-gradient-to-b from-slate-100 to-slate-300 px-4 py-3 text-sm font-bold text-slate-900 dark:border-slate-600 dark:from-slate-700 dark:to-slate-900 dark:text-slate-100`}
          >
            {plusReady ? 'Alles klar — zu den Einstellungen' : 'Zu den Einstellungen'}
          </button>
        </div>
      </div>
    </main>
  )
}
