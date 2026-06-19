'use client'

import Link from 'next/link'

import LoginForm from '../../components/LoginForm'
import { MAIN_PAGE_INSET_CLASS, MAIN_SHELL_CLASS } from '../../lib/appShell'

export default function LoginPage() {
  return (
    <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto w-full max-w-md px-4`}>
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          LifeXP Family
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Anmelden</h1>
      </div>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        Noch kein Konto?{' '}
        <Link href="/signup" className="font-semibold text-emerald-700 underline dark:text-emerald-300">
          Registrieren
        </Link>
      </p>
    </main>
  )
}
