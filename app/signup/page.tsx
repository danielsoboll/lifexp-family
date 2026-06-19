'use client'

import Link from 'next/link'

import SignupForm from '../../components/SignupForm'
import { MAIN_PAGE_INSET_CLASS, MAIN_SHELL_CLASS } from '../../lib/appShell'

export default function SignupPage() {
  return (
    <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto w-full max-w-md px-4`}>
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          LifeXP Family
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Konto erstellen</h1>
      </div>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        Schon registriert?{' '}
        <Link href="/login" className="font-semibold text-emerald-700 underline dark:text-emerald-300">
          Anmelden
        </Link>
      </p>
    </main>
  )
}
