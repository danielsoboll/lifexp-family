'use client'

import FamilySetupForm from '../../../components/FamilySetupForm'
import { MAIN_PAGE_INSET_CLASS, MAIN_SHELL_CLASS } from '../../../lib/appShell'

export default function FamilySetupPage() {
  return (
    <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto w-full max-w-md px-4`}>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          LifeXP Family
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Familie einrichten</h1>
      </div>
      <FamilySetupForm />
    </main>
  )
}
