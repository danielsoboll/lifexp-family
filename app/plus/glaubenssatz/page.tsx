'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import PageHeaderBar from '../../../components/PageHeaderBar'
import { areaInfoHref, AREA_INFO_SUBAREA } from '../../../lib/areaInfoNav'
import { CARD_SURFACE_CLASS, MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS } from '../../../lib/appShell'
import { fetchBeliefForCurrentProfile, type BeliefContent } from '../../../lib/beliefs'
import { PLUS_XP_GLAUBENSSATZ_MAX } from '../../../lib/plusXpBudget'
import { fetchLatestTodaySelection, recordXpEvent } from '../../../lib/xpEvents'

export default function PlusGlaubenssatzPage() {
  const router = useRouter()
  const [belief, setBelief] = useState<BeliefContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [savedXp, setSavedXp] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loadHint, setLoadHint] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [{ belief: loaded, error: beliefError, emptyTable }, { selection, error: xpError }] =
        await Promise.all([
          fetchBeliefForCurrentProfile(),
          fetchLatestTodaySelection({ category: 'plus', source: 'glaubenssatz' }),
        ])
      if (cancelled) return
      setLoading(false)
      if (beliefError || xpError) {
        setErrorMessage(beliefError?.message ?? xpError?.message ?? '')
        return
      }
      setErrorMessage('')
      if (emptyTable) {
        setLoadHint(
          'Es konnten keine Glaubenssätze aus der Datenbank geladen werden (Tabelle belief: Lesezugriff/RLS prüfen).',
        )
        setBelief(null)
      } else if (!loaded) {
        setLoadHint('Kein passender Glaubenssatz für dein Profil gefunden.')
        setBelief(null)
      } else {
        setLoadHint('')
        setBelief(loaded)
      }
      if (selection) {
        setSavedXp(selection.selectedXp)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const complete = async () => {
    if (!belief || savedXp >= PLUS_XP_GLAUBENSSATZ_MAX) {
      router.push('/plus')
      return
    }

    const targetXp = PLUS_XP_GLAUBENSSATZ_MAX
    const delta = targetXp - savedXp

    setSubmitting(true)
    setErrorMessage('')
    const { error } = await recordXpEvent({
      category: 'plus',
      source: 'glaubenssatz',
      xp: delta,
      metadata: {
        label: belief.title,
        belief_id: belief.id,
        belief_text: belief.text,
        selected_xp: targetXp,
        previous_xp: savedXp,
      },
    })
    setSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    router.push('/plus')
  }

  const done = savedXp >= PLUS_XP_GLAUBENSSATZ_MAX

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <PageHeaderBar
          backHref="/plus"
          infoHref={areaInfoHref('/plus/glaubenssatz')}
          infoLabel={`Info zu ${AREA_INFO_SUBAREA.plus.glaubenssatz}`}
        />

        <header className="mb-6 flex items-center gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-3xl ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:ring-emerald-800/60"
            aria-hidden
          >
            ✨
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Glaubenssatz</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Dein Satz für heute</p>
          </div>
        </header>

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Laden …</p>
        ) : belief ? (
          <section className={`rounded-2xl p-4 ${CARD_SURFACE_CLASS}`}>
            {belief.title ? (
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {belief.title}
              </p>
            ) : null}
            {belief.text ? (
              <p
                className={`whitespace-pre-wrap text-xl font-bold leading-snug text-slate-900 dark:text-slate-100 ${
                  belief.title ? 'mt-3' : ''
                }`}
              >
                {belief.text}
              </p>
            ) : null}
          </section>
        ) : (
          <p className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
            {loadHint || 'Für dein Profil ist noch kein Glaubenssatz hinterlegt.'}
          </p>
        )}

        {errorMessage ? (
          <p
            className="mt-4 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        {done ? (
          <p className="mt-6 rounded-2xl border-2 border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-center text-sm font-medium text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100">
            Heute erledigt (+{PLUS_XP_GLAUBENSSATZ_MAX} Plus-XP).
          </p>
        ) : (
          <button
            type="button"
            disabled={submitting || !belief}
            onClick={() => void complete()}
            className="lifexp-pressable-3d mt-6 w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-500"
          >
            {submitting ? 'Speichern …' : `Erledigt! Plus ${PLUS_XP_GLAUBENSSATZ_MAX} Plus-XP`}
          </button>
        )}
      </div>
    </main>
  )
}
