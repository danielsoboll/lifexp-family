'use client'

import Link from 'next/link'

import PlusLockHeaderButton from './PlusLockHeaderButton'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type RecurringQuestsEntryActionProps = {
  show: boolean
  plusActive: boolean
  /** false = dezenter Link (Paywall auf /quests/recurring). Default: kein zweiter PLUS-CTA. */
  showEmbeddedPayTrigger?: boolean
  onDiscoverPlus?: () => void
}

const ACTIVE_LINK_CLASS = `${PRESSABLE_3D_CLASS} flex w-full items-center gap-3 rounded-xl border-2 border-emerald-400/80 bg-gradient-to-b from-emerald-50/90 to-emerald-100/70 px-3.5 py-2.5 text-sm font-bold text-emerald-950 dark:border-emerald-700/70 dark:from-emerald-950/40 dark:to-emerald-900/30 dark:text-emerald-100`

const SECONDARY_LINK_CLASS =
  'flex w-full items-center gap-3 rounded-xl border border-slate-300/90 bg-white/70 px-3.5 py-2.5 text-left transition hover:border-slate-400 hover:bg-white dark:border-slate-600/80 dark:bg-slate-900/50 dark:hover:border-slate-500'

export default function RecurringQuestsEntryAction({
  show,
  plusActive,
  showEmbeddedPayTrigger = false,
  onDiscoverPlus,
}: RecurringQuestsEntryActionProps) {
  if (!show) return null

  if (plusActive) {
    return (
      <Link href="/quests/recurring" className={ACTIVE_LINK_CLASS} aria-label="Wiederkehrende Quests verwalten">
        <span className="text-lg leading-none" aria-hidden>
          🔁
        </span>
        <span className="min-w-0 flex-1">Wiederkehrende Quests</span>
        <span className="shrink-0 text-xs font-semibold text-emerald-800/80 dark:text-emerald-200/80" aria-hidden>
          ›
        </span>
      </Link>
    )
  }

  if (showEmbeddedPayTrigger && onDiscoverPlus) {
    return (
      <PlusLockHeaderButton
        variant="cta"
        label="Wiederkehrende Quests — LifeXP Family PLUS"
        onClick={onDiscoverPlus}
      >
        Wiederkehrende Quests eintragen
      </PlusLockHeaderButton>
    )
  }

  return (
    <Link href="/quests/recurring" className={SECONDARY_LINK_CLASS} aria-label="Wiederkehrende Quests — PLUS">
      <span className="text-lg leading-none opacity-90" aria-hidden>
        🔁
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">Wiederkehrende Quests</span>
        <span className="mt-0.5 block text-xs text-slate-950 dark:text-slate-400">
          Automatisch eintragen · <span className="font-semibold text-amber-800/90 dark:text-amber-300/90">PLUS</span>
        </span>
      </span>
      <span className="shrink-0 text-sm text-slate-950 dark:text-slate-500" aria-hidden>
        ›
      </span>
    </Link>
  )
}
