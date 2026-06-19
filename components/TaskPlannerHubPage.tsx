'use client'

import Link from 'next/link'

import PageHeaderBar from './PageHeaderBar'
import TaskColorEigeneLink from './TaskColorEigeneLink'
import { areaInfoHref } from '../lib/areaInfoNav'
import { MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS } from '../lib/appShell'
import { useTaskColorLabels } from '../lib/useTaskColorLabels'

function dayChoiceLinkClass(variant: 'default' | 'heute' = 'default') {
  const shell =
    'lifexp-pressable-3d w-full rounded-2xl border-2 border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 text-center font-bold leading-snug hover:border-stone-500 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950'
  if (variant === 'heute') {
    return `${shell} my-1 px-4 py-4 text-base text-yellow-950/85 dark:text-yellow-100/90`
  }
  return `${shell} px-4 py-3.5 text-sm text-stone-800 dark:text-stone-200`
}

function weekPlanLinkClass() {
  return 'lifexp-pressable-3d w-full rounded-2xl border-2 border-sky-400 bg-gradient-to-b from-sky-50 via-sky-100/95 to-sky-300/80 px-4 py-3.5 text-center text-sm font-bold leading-snug text-sky-950 hover:border-sky-500 dark:border-sky-600 dark:from-sky-950/55 dark:via-sky-900/50 dark:to-sky-950 dark:text-sky-100'
}

export default function TaskPlannerHubPage() {
  const { hasCustomLabels } = useTaskColorLabels()

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <PageHeaderBar
          backHref="/"
          infoHref={areaInfoHref('/plus/aufgabenplaner')}
          infoLabel="Info zum Aufgabenplaner"
          headerSecondaryAction={<TaskColorEigeneLink hasCustomLabels={hasCustomLabels} />}
        />

        <header className="mb-6 flex items-center gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-violet-300/80 bg-gradient-to-b from-violet-50 via-violet-100/95 to-violet-200/80 text-3xl ring-1 ring-violet-200/60 dark:border-violet-700 dark:from-violet-950/50 dark:via-violet-900/40 dark:to-violet-950 dark:ring-violet-800/50"
            aria-hidden
          >
            📋
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Aufgabenplaner
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Prioritäten für den Tag setzen</p>
          </div>
        </header>

        <fieldset className="flex flex-col">
          <legend className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Zeitraum</legend>
          <div className="flex flex-col gap-3" role="group" aria-label="Zeitraum wählen">
            <Link href="/plus/aufgabenplaner/gestern" className={dayChoiceLinkClass()}>
              Gestern
            </Link>
            <Link href="/plus/aufgabenplaner/heute" className={dayChoiceLinkClass('heute')}>
              Heute
            </Link>
            <Link href="/plus/aufgabenplaner/morgen" className={dayChoiceLinkClass()}>
              Morgen
            </Link>
            <Link href="/plus/aufgabenplaner/datum" className={`${dayChoiceLinkClass()} mt-3`}>
              zum Datum
            </Link>
            <Link href="/plus/aufgabenplaner/woche" className={`${weekPlanLinkClass()} mt-6`}>
              Wochenplan
            </Link>
          </div>
        </fieldset>
      </div>
    </main>
  )
}
