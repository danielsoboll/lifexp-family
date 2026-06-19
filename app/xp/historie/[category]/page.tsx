'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import ThemeToggle from '../../../../components/ThemeToggle'
import XpHistoryChart from '../../../../components/XpHistoryChart'
import { MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS, PILL_BACK_CLASS } from '../../../../lib/appShell'
import { cetFormatShortDate } from '../../../../lib/cetDate'
import {
  fetchCategoryXpHistory,
  isXpHistoryCategory,
  XP_HISTORY_LABELS,
  type XpHistoryDay,
} from '../../../../lib/xpHistory'
import type { DailyXpEventCategory } from '../../../../lib/xpEvents'

export default function XpHistoryPage() {
  const params = useParams()
  const rawCategory = typeof params.category === 'string' ? params.category : ''
  const category: DailyXpEventCategory | null = isXpHistoryCategory(rawCategory) ? rawCategory : null

  const [days, setDays] = useState<XpHistoryDay[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [target, setTarget] = useState(0)
  const [max, setMax] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!category) {
      setLoading(false)
      return
    }

    let cancelled = false
    void (async () => {
      setLoading(true)
      const result = await fetchCategoryXpHistory(category)
      if (cancelled) return
      setLoading(false)
      if (result.error) {
        setErrorMessage(result.error.message)
        return
      }
      setErrorMessage('')
      setDays(result.days)
      setStartDate(result.startDate)
      setEndDate(result.endDate)
      setTarget(result.target)
      setMax(result.max)
    })()

    return () => {
      cancelled = true
    }
  }, [category])

  if (!category) {
    return (
      <main className={MAIN_SHELL_CLASS}>
        <div className={`mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
          <p className="text-sm text-red-700 dark:text-red-400">Unbekannte XP-Kategorie.</p>
          <Link href="/xp" className={`${PILL_BACK_CLASS} mt-4`}>
            Zurück zur Übersicht
          </Link>
        </div>
      </main>
    )
  }

  const meta = XP_HISTORY_LABELS[category]

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

        <header className="mb-4">
          <p className="text-2xl leading-none" aria-hidden>
            {meta.icon}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {meta.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Tägliche {meta.shortTitle} seit{' '}
            {startDate ? cetFormatShortDate(startDate) : '—'} bis{' '}
            {endDate ? cetFormatShortDate(endDate) : 'heute'}.
          </p>
        </header>

        {errorMessage ? (
          <p className="mb-3 text-sm text-red-700 dark:text-red-400" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Historie wird geladen …</p>
        ) : (
          <XpHistoryChart days={days} target={target} max={max} />
        )}
      </div>
    </main>
  )
}
