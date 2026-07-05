'use client'

import Link from 'next/link'

import ChildProfileCard from '../../components/ChildProfileCard'
import PageHeaderBar from '../../components/PageHeaderBar'
import { useFamily } from '../../components/FamilyProvider'
import { MAIN_PAGE_INSET_CLASS, MAIN_SHELL_CLASS, HOME_BACK_LABEL, PRESSABLE_3D_CLASS } from '../../lib/appShell'

export default function ChildrenPage() {
  const { children, loading, error } = useFamily()

  return (
    <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto w-full max-w-lg px-4`}>
      <PageHeaderBar backHref="/" backLabel={HOME_BACK_LABEL} />
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Kinder</h1>
        <Link
          href="/children/new"
          className={`${PRESSABLE_3D_CLASS} rounded-full border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-2 text-sm font-bold text-white`}
        >
          + Familienmitglied hinzufügen
        </Link>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-950 dark:text-slate-400">Kinder werden geladen …</p>
      ) : children.length === 0 ? (
        <p className="text-sm text-slate-950 dark:text-slate-400">Noch keine Kinderprofile angelegt.</p>
      ) : (
        <div className="space-y-3">
          {children.map((child) => (
            <ChildProfileCard key={child.id} child={child} href={`/children/${child.id}`} />
          ))}
        </div>
      )}
    </main>
  )
}
