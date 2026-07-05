'use client'

import { formatRecoveryCodeDisplay } from '../lib/recoveryCode'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type RecoveryCodePanelProps = {
  code: string
  variant?: 'onboarding' | 'settings'
  recCodeOk?: boolean
  showDoneButton?: boolean
  doneSaving?: boolean
  onDone?: () => void
  hideDoneStatus?: boolean
}

export default function RecoveryCodePanel({
  code,
  variant = 'settings',
  recCodeOk = false,
  showDoneButton = false,
  doneSaving = false,
  onDone,
  hideDoneStatus = false,
}: RecoveryCodePanelProps) {
  const displayCode = formatRecoveryCodeDisplay(code)

  return (
    <div className="flex flex-col gap-3">
      {variant === 'onboarding' ? (
        <div className="rounded-2xl border-2 border-emerald-300/90 bg-emerald-50/95 px-3 py-3 dark:border-emerald-700/55 dark:bg-emerald-950/40">
          <p className="text-sm leading-relaxed text-slate-950 dark:text-slate-300">
            Bitte speichere jetzt deinen Recovery-Code, damit dein Profil niemals verloren geht.
          </p>
        </div>
      ) : null}

      <div className="rounded-2xl border-2 border-slate-400/90 bg-gradient-to-br from-slate-100 via-slate-200/70 to-slate-100 px-4 py-4 text-center dark:border-slate-600 dark:from-slate-800 dark:via-slate-900/90 dark:to-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-950 dark:text-slate-400">
          Recovery-Code
        </p>
        <p
          className="mt-2 font-mono text-2xl font-black tracking-[0.12em] text-slate-900 dark:text-slate-100"
          aria-label={`Recovery-Code ${displayCode}`}
        >
          {displayCode || '–'}
        </p>
      </div>

      <p className="text-sm leading-relaxed text-slate-950 dark:text-slate-300">
        Wenn du dein Handy verlierst oder die App neu installierst, kannst du mit diesem Code dein
        Familienprofil wiederherstellen.
      </p>
      <p className="text-sm font-semibold leading-relaxed text-amber-900 dark:text-amber-200">
        Bitte jetzt einen Screenshot machen.
      </p>

      {recCodeOk && !hideDoneStatus ? (
        <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100">
          ✓ Recovery-Code gespeichert — Erledigt
        </p>
      ) : null}

      {showDoneButton && !recCodeOk ? (
        <button
          type="button"
          onClick={onDone}
          disabled={doneSaving || !displayCode}
          className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {doneSaving ? 'Wird gespeichert …' : 'Erledigt!'}
        </button>
      ) : null}
    </div>
  )
}
