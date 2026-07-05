'use client'

import Link from 'next/link'

import PageHeaderBar from '../../components/PageHeaderBar'
import QuestList from '../../components/QuestList'
import RecurringQuestsEntryAction from '../../components/RecurringQuestsEntryAction'
import { useFamily } from '../../components/FamilyProvider'
import { usePlusDiscoverHeader } from '../../hooks/usePlusDiscoverHeader'
import { MAIN_PAGE_INSET_CLASS, MAIN_SHELL_CLASS, HOME_BACK_LABEL, PRESSABLE_3D_CLASS } from '../../lib/appShell'

export default function QuestsPage() {
  const { family } = useFamily()
  const { showHeader, plusActive, headerAction: plusHeaderAction, portals: plusPortals } =
    usePlusDiscoverHeader()

  return (
    <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto w-full max-w-lg px-4`}>
      <PageHeaderBar backHref="/" backLabel={HOME_BACK_LABEL} headerAction={plusHeaderAction} />
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Family-Quests</h1>
            <p className="mt-1 text-sm text-slate-950 dark:text-slate-400">
            Von der Familie eingetragen — heute und morgen. Wiederkehrende Vorlagen verwaltest du separat.
          </p>
          </div>
          <Link
            href="/quests/new"
            className={`${PRESSABLE_3D_CLASS} group inline-flex shrink-0 items-center gap-2 rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-700 px-3.5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-900/25 ring-2 ring-emerald-200/50 transition-[transform,box-shadow] hover:shadow-lg hover:shadow-emerald-900/30 active:scale-[0.98] dark:ring-emerald-800/60`}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-base shadow-inner"
              aria-hidden
            >
              ✨
            </span>
            Eintragen
          </Link>
        </div>
        <RecurringQuestsEntryAction show={showHeader} plusActive={plusActive} />
      </div>
      {family ? <QuestList /> : null}
      {plusPortals}
    </main>
  )
}
