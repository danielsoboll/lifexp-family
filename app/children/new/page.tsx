'use client'

import { useRouter } from 'next/navigation'

import ChildProfileForm from '../../../components/ChildProfileForm'
import PageHeaderBar from '../../../components/PageHeaderBar'
import { useFamily } from '../../../components/FamilyProvider'
import { MAIN_PAGE_INSET_CLASS, MAIN_SHELL_CLASS } from '../../../lib/appShell'

export default function NewChildPage() {
  const router = useRouter()
  const { family } = useFamily()

  if (!family) return null

  return (
    <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto w-full max-w-lg px-4`}>
      <PageHeaderBar backHref="/children" backLabel="Kinder" />
      <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">Kind anlegen</h1>
      <ChildProfileForm familyId={family.id} onCreated={() => router.push('/children')} />
    </main>
  )
}
