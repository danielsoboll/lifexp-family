'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { signIn } from '../lib/auth'
import { CARD_SURFACE_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signIn({ email, password })
      router.replace('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={`${CARD_SURFACE_CLASS} space-y-4 rounded-2xl p-5`}>
      <div>
        <label htmlFor="login-email" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          E-Mail
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>
      <div>
        <label htmlFor="login-password" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Passwort
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-bold text-white disabled:opacity-60`}
      >
        {loading ? 'Wird angemeldet …' : 'Anmelden'}
      </button>
    </form>
  )
}
