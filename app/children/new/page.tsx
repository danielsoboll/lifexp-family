'use client'

import { useRouter } from 'next/navigation'

import ChildProfileForm from '../../../components/ChildProfileForm'
import PageHeaderBar from '../../../components/PageHeaderBar'
import { useFamily } from '../../../components/FamilyProvider'
import { MAIN_PAGE_INSET_CLASS, MAIN_SHELL_CLASS } from '../../../lib/appShell'

export default function NewChildPage() {
  const router = useRouter()
  const { family, loading, error } = useFamily()

  if (loading) {
    return (
      <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto flex min-h-[50dvh] w-full max-w-lg items-center justify-center px-4`}>
        <p className="text-sm text-slate-600 dark:text-slate-400">Familie wird geladen …</p>
      </main>
    )
  }

  if (!family) {
    return (
      <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto w-full max-w-lg px-4`}>
        <PageHeaderBar backHref="/" backLabel="Dashboard" />
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error ?? 'Keine Familie gefunden. Bitte zuerst unter „Familie einrichten“ anlegen.'}
        </p>
      </main>
    )
  }

  return (
    <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto w-full max-w-lg px-4`}>
      <PageHeaderBar backHref="/" backLabel="Dashboard" />
      <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">Kind anlegen</h1>
      <ChildProfileForm
        familyId={family.id}
        onCreated={async () => {
          router.push('/')
          router.refresh()
        }}
      />
    </main>
  )
}
