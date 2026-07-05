'use client'

import { useParams } from 'next/navigation'

import MemberDetailView from '../../../components/MemberDetailView'
import PageHeaderBar from '../../../components/PageHeaderBar'
import SetupGuideMemberVisitTracker from '../../../components/SetupGuideMemberVisitTracker'
import { MAIN_PAGE_INSET_CLASS, MAIN_SHELL_CLASS, HOME_BACK_LABEL } from '../../../lib/appShell'

export default function ChildDetailPage() {
  const params = useParams<{ childId: string }>()

  return (
    <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto w-full max-w-lg px-4`}>
      <PageHeaderBar backHref="/" backLabel={HOME_BACK_LABEL} />
      <SetupGuideMemberVisitTracker memberKind="child" memberId={params.childId} />
      <MemberDetailView memberKind="child" memberId={params.childId} />
    </main>
  )
}
