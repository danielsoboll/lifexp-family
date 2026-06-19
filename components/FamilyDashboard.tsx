'use client'

import Link from 'next/link'

import { useAuth } from './AuthProvider'
import { useFamily } from './FamilyProvider'
import ChildProfileCard from './ChildProfileCard'
import DashboardButton from './DashboardButton'
import LegalFooterNav from './LegalFooterNav'
import ThemeToggle from './ThemeToggle'
import { cetFormatLongDateDe, cetToday } from '../lib/cetDate'
import { CARD_SURFACE_CLASS, HOME_PAGE_INSET_CLASS, MAIN_SHELL_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

export default function FamilyDashboard() {
  const { user, signOut } = useAuth()
  const { family, children, loading, error } = useFamily()

  const todayLabel = cetFormatLongDateDe(cetToday())
  const totalTodayXp = children.reduce((sum, child) => sum + child.todayXp, 0)

  return (
    <main className={`${MAIN_SHELL_CLASS} ${HOME_PAGE_INSET_CLASS} mx-auto flex w-full max-w-lg flex-col gap-6 px-4`}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            LifeXP Family
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {family?.name ?? 'Familie'}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{todayLabel}</p>
        </div>
        <ThemeToggle />
      </header>

      <section className={`${CARD_SURFACE_CLASS} rounded-2xl p-4`}>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Angemeldet als <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.email}</span>
        </p>
        <p className="mt-2 text-lg font-bold text-emerald-700 dark:text-emerald-300">
          Heute gesamt: +{totalTodayXp} XP
        </p>
      </section>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Wird geladen …</p>
      ) : children.length === 0 ? (
        <section className={`${CARD_SURFACE_CLASS} rounded-2xl p-4`}>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Noch keine Kinderprofile</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Lege zuerst ein Kinderprofil an, damit du Quests zuweisen und XP buchen kannst.
          </p>
          <Link
            href="/children/new"
            className={`${PRESSABLE_3D_CLASS} mt-4 inline-flex rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-sm font-bold text-white`}
          >
            Kind anlegen
          </Link>
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Kinder</h2>
          {children.map((child) => (
            <ChildProfileCard key={child.id} child={child} href={`/children/${child.id}`} />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Aktionen</h2>
        <DashboardButton
          href="/quests"
          emoji="🎯"
          title="Quests"
          subtitle="Aufgaben erledigen und XP vergeben"
          xpHint="Tägliche Familien-Quests"
        />
        <DashboardButton
          href="/children"
          emoji="👨‍👩‍👧‍👦"
          title="Kinder verwalten"
          subtitle="Profile anlegen und bearbeiten"
        />
        <DashboardButton
          href="/quests/new"
          emoji="✨"
          title="Neue Quest"
          subtitle="Eigene Aufgabe für die Familie erstellen"
        />
      </section>

      <button
        type="button"
        onClick={() => void signOut()}
        className={`${PRESSABLE_3D_CLASS} rounded-2xl border-2 border-stone-400 px-4 py-2.5 text-sm font-semibold text-stone-800 dark:border-stone-600 dark:text-stone-100`}
      >
        Abmelden
      </button>

      <LegalFooterNav />
    </main>
  )
}
