'use client'

import { useRouter } from 'next/navigation'

import AdminScrollPage from '../../../../components/AdminScrollPage'
import FamilyMemberAddForm from '../../../../components/FamilyMemberAddForm'
import PageHeaderBar from '../../../../components/PageHeaderBar'
import { useFamily } from '../../../../components/FamilyProvider'
import { MAIN_SHELL_CLASS } from '../../../../lib/appShell'

export default function NewAdultPage() {
  const router = useRouter()
  const { family, loading, error } = useFamily()

  if (loading) {
    return (
      <main className={`${MAIN_SHELL_CLASS} mx-auto flex min-h-dvh w-full max-w-lg items-center justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))]`}>
        <p className="text-sm text-slate-950 dark:text-slate-400">Familie wird geladen …</p>
      </main>
    )
  }

  if (!family) {
    return (
      <AdminScrollPage>
        <PageHeaderBar backHref="/admin" backLabel="Admin" compact />
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error ?? 'Keine Familie gefunden.'}
        </p>
      </AdminScrollPage>
    )
  }

  return (
    <AdminScrollPage>
      <PageHeaderBar backHref="/admin" backLabel="Admin" compact />
      <h1 className="mb-3 text-xl font-bold text-slate-900 dark:text-slate-100">Erwachsenen hinzufügen</h1>
      <FamilyMemberAddForm
        familyId={family.id}
        memberKind="adult"
        onCreated={async () => {
          router.push('/admin')
          router.refresh()
        }}
      />
    </AdminScrollPage>
  )
}
