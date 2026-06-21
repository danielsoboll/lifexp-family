'use client'

import { useParams } from 'next/navigation'

import MemberDetailView from '../../../components/MemberDetailView'
import PageHeaderBar from '../../../components/PageHeaderBar'
import SetupGuideMemberVisitTracker from '../../../components/SetupGuideMemberVisitTracker'
import { MAIN_PAGE_INSET_CLASS, MAIN_SHELL_CLASS } from '../../../lib/appShell'

export default function ParentDetailPage() {
  const params = useParams<{ parentId: string }>()

  return (
    <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto w-full max-w-lg px-4`}>
      <PageHeaderBar backHref="/" backLabel="Dashboard" />
      <SetupGuideMemberVisitTracker memberKind="parent" memberId={params.parentId} />
      <MemberDetailView memberKind="parent" memberId={params.parentId} />
    </main>
  )
}
