'use client'

import Link from 'next/link'

import FamilyDashboard from '../components/FamilyDashboard'
import { useAuth } from '../components/AuthProvider'
import { useFamily } from '../components/FamilyProvider'
import { MAIN_SHELL_CLASS } from '../lib/appShell'

export default function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const { loading: familyLoading } = useFamily()

  if (authLoading || familyLoading) {
    return (
      <main className={`${MAIN_SHELL_CLASS} flex min-h-dvh items-center justify-center text-sm text-slate-600 dark:text-slate-400`}>
        <p>Wird geladen …</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className={`${MAIN_SHELL_CLASS} flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center`}>
        <p className="text-sm text-slate-600 dark:text-slate-400">Bitte melde dich an, um fortzufahren.</p>
        <Link href="/login" className="font-semibold text-emerald-700 underline dark:text-emerald-300">
          Zum Login
        </Link>
      </main>
    )
  }

  return <FamilyDashboard />
}
