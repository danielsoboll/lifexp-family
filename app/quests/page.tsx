'use client'

import Link from 'next/link'

import PageHeaderBar from '../../components/PageHeaderBar'
import QuestList from '../../components/QuestList'
import { useFamily } from '../../components/FamilyProvider'
import { MAIN_PAGE_INSET_CLASS, MAIN_SHELL_CLASS, PRESSABLE_3D_CLASS } from '../../lib/appShell'

export default function QuestsPage() {
  const { family } = useFamily()

  return (
    <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto w-full max-w-lg px-4`}>
      <PageHeaderBar backHref="/" backLabel="Dashboard" />
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Quests</h1>
        <Link
          href="/quests/new"
          className={`${PRESSABLE_3D_CLASS} rounded-full border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-2 text-sm font-bold text-white`}
        >
          + Neu
        </Link>
      </div>
      {family ? <QuestList /> : null}
    </main>
  )
}
