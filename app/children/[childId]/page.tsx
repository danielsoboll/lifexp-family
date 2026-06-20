'use client'

import { useParams } from 'next/navigation'

import MemberDetailView from '../../../components/MemberDetailView'
import PageHeaderBar from '../../../components/PageHeaderBar'
import { MAIN_PAGE_INSET_CLASS, MAIN_SHELL_CLASS } from '../../../lib/appShell'

export default function ChildDetailPage() {
  const params = useParams<{ childId: string }>()

  return (
    <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto w-full max-w-lg px-4`}>
      <PageHeaderBar backHref="/" backLabel="Dashboard" />
      <MemberDetailView memberKind="child" memberId={params.childId} />
    </main>
  )
}
