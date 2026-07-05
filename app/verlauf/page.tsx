'use client'

import FamilyHistoryList from '../../components/FamilyHistoryList'
import PageHeaderBar from '../../components/PageHeaderBar'
import { MAIN_PAGE_INSET_CLASS, MAIN_SHELL_CLASS, HOME_BACK_LABEL } from '../../lib/appShell'

export default function VerlaufPage() {
  return (
    <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto w-full max-w-lg px-4`}>
      <PageHeaderBar backHref="/" backLabel={HOME_BACK_LABEL} />
      <h1 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">Verlauf</h1>
      <FamilyHistoryList />
    </main>
  )
}
