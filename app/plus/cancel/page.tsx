'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useBillingReturnRecovery } from '@/hooks/useBillingReturnRecovery'
import { BILLING_RETURN_TARGET_PATH } from '@/lib/family/billingReturn'
import { CARD_SURFACE_CLASS, HOME_PAGE_INSET_CLASS, MAIN_SHELL_CLASS, PRESSABLE_3D_CLASS } from '@/lib/appShell'

export default function PlusCancelPage() {
  const router = useRouter()
  const { bootstrapped, hasSession, loading } = useBillingReturnRecovery({ redirectWhenReady: false })

  useEffect(() => {
    if (!bootstrapped || loading || !hasSession) return
    const timer = window.setTimeout(() => {
      router.replace(BILLING_RETURN_TARGET_PATH)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [bootstrapped, loading, hasSession, router])

  return (
    <main className={`${MAIN_SHELL_CLASS} ${HOME_PAGE_INSET_CLASS} mx-auto flex w-full max-w-lg flex-col gap-4 px-4`}>
      <div className={`${CARD_SURFACE_CLASS} rounded-2xl p-5`}>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">PLUS nicht aktiviert</h1>
        <p className="mt-2 text-sm text-slate-950 dark:text-slate-300">
          Der Checkout wurde abgebrochen. Du kannst PLUS jederzeit in den Admin-Einstellungen aktivieren.
        </p>
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
