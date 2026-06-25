'use client'

import { Suspense } from 'react'

import PlusSuccessContent from './PlusSuccessContent'
import { HOME_PAGE_INSET_CLASS, MAIN_SHELL_CLASS } from '@/lib/appShell'

export default function PlusSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className={`${MAIN_SHELL_CLASS} ${HOME_PAGE_INSET_CLASS} mx-auto max-w-lg px-4 py-8 text-sm text-slate-950 dark:text-slate-300`}>
          PLUS wird synchronisiert …
        </main>
      }
    >
      <PlusSuccessContent />
    </Suspense>
  )
}
