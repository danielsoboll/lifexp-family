'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { fetchAreaInfo, type AreaInfoKey, type FetchAreaInfoOptions } from '../lib/areaInfo'
import { CARD_SURFACE_CLASS, MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS, PILL_BACK_CLASS } from '../lib/appShell'
import ThemeToggle from './ThemeToggle'

type AreaInfoPageProps = {
  area: AreaInfoKey
  title: string
  emoji: string
  backHref: string
  fetchOptions?: FetchAreaInfoOptions
}

export default function AreaInfoPage({
  area,
  title,
  emoji,
  backHref,
  fetchOptions,
}: AreaInfoPageProps) {
  const [contentTitle, setContentTitle] = useState(title)
  const [content, setContent] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { info, error } = await fetchAreaInfo(area, fetchOptions)
      if (cancelled) return
      if (error) {
        setErrorMessage(error.message)
        return
      }
      setErrorMessage('')
      setContentTitle(info?.title || title)
      setContent(info?.content || '')
    })()
    return () => {
      cancelled = true
    }
  }, [area, title, fetchOptions?.subarea])

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href={backHref} className={`${PILL_BACK_CLASS} mb-0`}>
            <span aria-hidden>←</span>
            Zurück
          </Link>
          <ThemeToggle />
        </div>

        <header className="mb-6 flex items-center gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-3xl ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:ring-emerald-800/60"
            aria-hidden
          >
            {emoji}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {contentTitle}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Info</p>
          </div>
        </header>

        <section
          className={`rounded-2xl p-5 text-base leading-relaxed text-slate-700 dark:text-slate-300 ${CARD_SURFACE_CLASS}`}
        >
          {content ? (
            <p className="whitespace-pre-wrap text-[1.05rem] leading-7">{content}</p>
          ) : (
            <p className="text-[1.05rem] leading-7">
              Hier erscheint später dein Infotext aus Supabase. Vorgesehene Tabelle:{' '}
              <span className="font-semibold">area_info</span> mit den Spalten{' '}
              <span className="font-semibold">area</span>, <span className="font-semibold">subarea</span>,{' '}
              <span className="font-semibold">title</span> und <span className="font-semibold">content</span>.
            </p>
          )}
          {errorMessage ? (
            <p className="mt-3 text-xs text-red-700 dark:text-red-400" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  )
}
