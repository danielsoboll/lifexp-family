'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import PageHeaderBar from '../../../components/PageHeaderBar'
import { areaInfoHref, AREA_INFO_SUBAREA } from '../../../lib/areaInfoNav'
import { MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS } from '../../../lib/appShell'
import { fetchLatestTodaySelection, recordXpEvent } from '../../../lib/xpEvents'

const MOTIVATION_CHOICES = [
  { label: 'Ich ziehe das hier jetzt durch 😁', xp: 2 },
  { label: 'Probiere ich mal 🤔', xp: 1 },
  { label: 'Mal sehen 😕', xp: 0 },
] as const

export default function MotivationPage() {
  const router = useRouter()
  const [selectedLabel, setSelectedLabel] = useState('')
  const [selectedXp, setSelectedXp] = useState(0)
  const [xpDelta, setXpDelta] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { selection, error } = await fetchLatestTodaySelection({
        category: 'plus',
        source: 'motivation',
      })
      if (cancelled) return
      if (error) {
        setErrorMessage(error.message)
        return
      }
      setErrorMessage('')
      if (selection) {
        setSelectedLabel(selection.label)
        setSelectedXp(selection.selectedXp)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isLocked) return
    const currentHref = window.location.href
    window.history.pushState({ lifexpLocked: true }, '', currentHref)
    const keepUserHere = () => {
      window.history.pushState({ lifexpLocked: true }, '', currentHref)
    }
    window.addEventListener('popstate', keepUserHere)
    const t = window.setTimeout(() => {
      router.push('/plus')
    }, 2000)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('popstate', keepUserHere)
    }
  }, [isLocked, router])

  const choose = async (choice: (typeof MOTIVATION_CHOICES)[number]) => {
    if (isLocked) return
    const previousLabel = selectedLabel
    const previousXp = selectedXp
    const delta = choice.xp - previousXp
    const { error } = await recordXpEvent({
      category: 'plus',
      source: 'motivation',
      xp: delta,
      metadata: {
        label: choice.label,
        selected_xp: choice.xp,
        previous_label: previousLabel || null,
        previous_xp: previousXp,
      },
    })
    if (error) {
      setErrorMessage(error.message)
      return
    }
    setErrorMessage('')
    setSelectedLabel(choice.label)
    setSelectedXp(choice.xp)
    setXpDelta(delta)
    setIsLocked(true)
  }

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <PageHeaderBar
          backHref="/plus"
          infoHref={areaInfoHref('/plus/motivation')}
          infoLabel={`Info zu ${AREA_INFO_SUBAREA.plus.motivation}`}
          onBackClick={(event) => {
            if (isLocked) event.preventDefault()
          }}
        />

        <header className="mb-6 flex items-center gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-3xl ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:ring-emerald-800/60"
            aria-hidden
          >
            💪
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Motivation
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Heute dranbleiben</p>
          </div>
        </header>

        <section className="flex flex-col gap-3" aria-label="Motivation auswählen">
          {MOTIVATION_CHOICES.map((choice) => {
            const selected = selectedLabel === choice.label
            return (
              <button
                key={choice.label}
                type="button"
                onClick={() => void choose(choice)}
                disabled={isLocked}
                className={`lifexp-pressable-3d flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left ring-1 disabled:cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                  selected
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-emerald-200/80 dark:border-emerald-500 dark:bg-emerald-950/45 dark:text-emerald-100 dark:ring-emerald-800/60'
                    : 'border-stone-400/90 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/70 text-slate-900 ring-stone-500/18 hover:border-emerald-400/90 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-slate-100 dark:ring-stone-600/30 dark:hover:border-emerald-500/80'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold">{choice.label}</span>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    Plus-XP + {choice.xp}
                  </span>
                </span>
              </button>
            )
          })}
        </section>

        {isLocked ? (
          <p className="mt-4 rounded-2xl border-2 border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-center text-sm font-medium text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100">
            Gespeichert: {selectedLabel} ({xpDelta >= 0 ? '+' : ''}{xpDelta} XP). Zurück zu Plus ...
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mt-4 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </main>
  )
}
