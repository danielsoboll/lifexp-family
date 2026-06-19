'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import LigaTower from '../../../components/LigaTower'
import ThemeToggle from '../../../components/ThemeToggle'
import type { AvatarGender } from '../../../lib/avatarLibrary'
import { loadCachedAvatarGender } from '../../../lib/avatarDisplayCache'
import { MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS, PILL_BACK_CLASS } from '../../../lib/appShell'
import { clampLigaXp, getLigaTierTitle, LIGA_XP_MAX } from '../../../lib/liga'
import { useLeagueStatus } from '../../../lib/useLeagueStatus'
import { fetchCurrentProfile } from '../../../lib/profile'

export default function LigaPage() {
  const { ligaXp, ligaTierId, errorMessage } = useLeagueStatus()
  const [avatarGender, setAvatarGender] = useState<AvatarGender>(loadCachedAvatarGender)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { settings, error: profileError } = await fetchCurrentProfile()
      if (cancelled) return
      if (!profileError) {
        setAvatarGender(settings.avatarGender)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const currentTierTitle = getLigaTierTitle(ligaTierId, avatarGender)
  const eliteGoalTitle = getLigaTierTitle('gold', avatarGender)
  const ligaProgress = clampLigaXp(ligaXp)
  const climbEliteHint =
    avatarGender === 'female'
      ? `so steigst du zur ${eliteGoalTitle}.`
      : `so steigst du Richtung ${eliteGoalTitle}.`

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link href="/xp" className={PILL_BACK_CLASS}>
            <span aria-hidden>←</span>
            Zurück zur Übersicht
          </Link>
          <ThemeToggle />
        </div>

        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Liga</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Steige mit Liga-XP von unten nach oben — jede Stufe bringt dich näher an die Elite.
          </p>
        </header>

        <div className="mb-4 rounded-2xl border-2 border-sky-300/80 bg-gradient-to-br from-sky-100/90 via-slate-100 to-slate-200/80 px-4 py-3 shadow-sm dark:border-sky-700/60 dark:from-sky-950/40 dark:via-slate-900 dark:to-sky-950/30">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                Dein Status
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {currentTierTitle}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Liga-XP
              </p>
              <p className="text-xl font-bold tabular-nums text-sky-800 dark:text-sky-200">
                {ligaProgress}
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">/{LIGA_XP_MAX}</span>
              </p>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <p className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </p>
        ) : null}

        <LigaTower
          ligaXp={ligaProgress}
          ligaXpMax={LIGA_XP_MAX}
          currentTierId={ligaTierId}
          avatarGender={avatarGender}
        />

        <p className="mt-5 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          „Bin dabei!“ und bewerte deinen Tag hier — {climbEliteHint}
        </p>

        <Link
          href="/xp/info"
          className="mx-auto mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
        >
          <span aria-hidden>ℹ️</span>
          Info zur Liga
        </Link>
      </div>
    </main>
  )
}
