'use client'

import { useRouter } from 'next/navigation'

import { useBillingReturnRecovery } from '@/hooks/useBillingReturnRecovery'
import { BILLING_RETURN_TARGET_PATH } from '@/lib/family/billingReturn'
import { FAMILY_PLUS_TAGLINE } from '@/lib/family/familyPlusFeatures'
import { CARD_SURFACE_CLASS, HOME_PAGE_INSET_CLASS, MAIN_SHELL_CLASS, PRESSABLE_3D_CLASS } from '@/lib/appShell'

export default function PlusCancelPage() {
  const router = useRouter()
  const { bootstrapped, hasSession, loading } = useBillingReturnRecovery({ redirectWhenReady: false })

  return (
    <main className={`${MAIN_SHELL_CLASS} ${HOME_PAGE_INSET_CLASS} mx-auto flex w-full max-w-lg flex-col gap-4 px-4`}>
      <div className={`${CARD_SURFACE_CLASS} rounded-2xl p-5`}>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">PLUS nicht aktiviert</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-950 dark:text-slate-300">{FAMILY_PLUS_TAGLINE}</p>
        <p className="mt-3 text-sm text-slate-950 dark:text-slate-300">
          Der Checkout wurde abgebrochen oder nicht abgeschlossen. Ohne Zahlung bei Stripe bleibt PLUS aus — du kannst
          es jederzeit in den Admin-Einstellungen erneut starten.
        </p>
        {!bootstrapped || loading ? (
          <p className="mt-3 text-xs font-semibold text-slate-950 dark:text-slate-400">Familie wird verbunden …</p>
        ) : !hasSession ? (
          <p className="mt-3 text-xs font-semibold text-amber-800 dark:text-amber-200">
            Sitzung nicht gefunden — bitte erneut einloggen.
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => router.replace(BILLING_RETURN_TARGET_PATH)}
          className={`${PRESSABLE_3D_CLASS} mt-5 w-full rounded-xl border-2 border-slate-500/80 bg-gradient-to-b from-slate-100 to-slate-300 px-4 py-3 text-sm font-bold text-slate-900 dark:border-slate-500 dark:from-slate-700 dark:to-slate-900 dark:text-slate-100`}
        >
          Zu den Einstellungen
        </button>
      </div>
    </main>
  )
}
