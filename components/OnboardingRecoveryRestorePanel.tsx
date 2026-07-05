'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  applyMemberToLocalSession,
  fetchMemberByRecoveryCode,
} from '../lib/family/memberRecoveryRestore'
import {
  normalizeRecoveryCodeInput,
  RECOVERY_RESTORE_MAX_ATTEMPTS,
} from '../lib/recoveryCode'
import { FORM_FIELD_INPUT_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

type OnboardingRecoveryRestorePanelProps = {
  onBack: () => void
}

export default function OnboardingRecoveryRestorePanel({ onBack }: OnboardingRecoveryRestorePanelProps) {
  const router = useRouter()
  const [codeInput, setCodeInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [locked, setLocked] = useState(false)

  const registerFailure = (message: string) => {
    const nextAttempt = attempts + 1
    setAttempts(nextAttempt)
    if (nextAttempt >= RECOVERY_RESTORE_MAX_ATTEMPTS) {
      setLocked(true)
      setError('Zu viele Fehlversuche. Recovery-Code-Eingabe ist vorübergehend gesperrt.')
      return
    }
    const remaining = RECOVERY_RESTORE_MAX_ATTEMPTS - nextAttempt
    setError(`${message} Noch ${remaining} ${remaining === 1 ? 'Versuch' : 'Versuche'}.`)
  }

  const handleRestore = async () => {
    if (locked || loading) return
    setLoading(true)
    setError(null)

    try {
      const { member, error: fetchError } = await fetchMemberByRecoveryCode(codeInput)
      if (fetchError) {
        registerFailure(fetchError.message)
        return
      }
      if (!member) {
        registerFailure('Recovery-Code nicht gefunden. Bitte prüfen und erneut versuchen.')
        return
      }

      applyMemberToLocalSession(member.session)
      router.replace('/')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lifexp-onboarding-sheet-reveal flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Profil wiederherstellen
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-950 dark:text-slate-400">
          Gib deinen Recovery-Code ein (z. B. LIFE-7K3P-92XQ), um dein Familienprofil wiederherzustellen — das
          Onboarding wird übersprungen.
        </p>
      </div>

      <div>
        <label htmlFor="lifexp-recovery-restore-code" className="mb-1 block text-sm font-semibold text-slate-950 dark:text-slate-200">
          Recovery-Code
        </label>
        <input
          id="lifexp-recovery-restore-code"
          type="text"
          value={codeInput}
          onChange={(event) => setCodeInput(normalizeRecoveryCodeInput(event.target.value))}
          placeholder="LIFE-7K3P-92XQ"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          disabled={locked || loading}
          className={`${FORM_FIELD_INPUT_CLASS} text-center text-lg tracking-[0.08em] disabled:opacity-50`}
          aria-label="Recovery-Code"
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div className="mt-auto space-y-3">
        <button
          type="button"
          disabled={locked || loading || !codeInput.trim()}
          onClick={() => void handleRestore()}
          className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3.5 text-base font-bold text-white disabled:opacity-60`}
        >
          {loading ? 'Wird wiederhergestellt …' : 'Wiederherstellen'}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full text-center text-xs font-semibold text-slate-950 underline-offset-2 hover:text-emerald-700 hover:underline dark:text-slate-400 dark:hover:text-emerald-300"
        >
          ← Zurück
        </button>
      </div>
    </div>
  )
}
