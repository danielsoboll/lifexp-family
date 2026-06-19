'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import DailyXpProgressCard from '../../components/DailyXpProgressCard'
import PageHeaderBar from '../../components/PageHeaderBar'
import { areaInfoHref } from '../../lib/areaInfoNav'
import ThemeToggle from '../../components/ThemeToggle'
import { MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS, PILL_BACK_CLASS } from '../../lib/appShell'
import {
  getDailyKnowledgeQuestions,
  type KnowledgeAnswerResult,
  type KnowledgeRoundQuestion,
} from '../../lib/knowledgeRound'
import {
  fetchKnowledgeQuestions,
  knowledgeQuestionDisplayText,
  type KnowledgeQuestionRow,
} from '../../lib/supabase'
import { XP_LIMITS, xpTargetForCategory } from '../../lib/xpDisplay'
import { LIFEXP_VIEW_DATE_CHANGED_EVENT } from '../../lib/activeEventDate'
import { fetchTodayQuizAnswerResults, fetchTodayXpForCategory } from '../../lib/xpEvents'

function questionPreview(row: KnowledgeQuestionRow, maxLen = 72): string {
  const full = knowledgeQuestionDisplayText(row)
  if (!full) return 'Zur Frage'
  return full.length <= maxLen ? full : `${full.slice(0, maxLen).trim()}…`
}

const FRAGE_EMOJI = ['1️⃣', '2️⃣', '3️⃣'] as const

function answeredSlotsQuery(
  questions: KnowledgeRoundQuestion[],
  answerResults: Record<string, KnowledgeAnswerResult>,
): string {
  const answeredSlots = questions
    .map((question, i) => (answerResults[question.key] ? i : null))
    .filter((slot): slot is number => slot !== null)
  return answeredSlots.length > 0 ? `&done=${answeredSlots.join(',')}` : ''
}

export default function WissenHubPage() {
  const [questions, setQuestions] = useState<KnowledgeRoundQuestion[]>([])
  const [answerResults, setAnswerResults] = useState<Record<string, KnowledgeAnswerResult>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [xpError, setXpError] = useState('')
  const [todayXp, setTodayXp] = useState(0)
  const [loading, setLoading] = useState(true)
  const [viewEpoch, setViewEpoch] = useState(0)

  useEffect(() => {
    const bump = () => setViewEpoch((n) => n + 1)
    window.addEventListener(LIFEXP_VIEW_DATE_CHANGED_EVENT, bump)
    return () => window.removeEventListener(LIFEXP_VIEW_DATE_CHANGED_EVENT, bump)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [
        { xp, error: todayXpError },
        { rows: data, error },
        { results: quizResults, error: quizResultsError },
      ] = await Promise.all([
        fetchTodayXpForCategory('wissen'),
        fetchKnowledgeQuestions(20),
        fetchTodayQuizAnswerResults(),
      ])
      if (cancelled) return
      if (todayXpError) {
        setXpError(todayXpError.message)
      } else {
        setXpError('')
        setTodayXp(xp)
      }
      setLoading(false)
      if (error) {
        setLoadError(error.message)
        setQuestions([])
        return
      }
      setLoadError(null)
      setQuestions(getDailyKnowledgeQuestions(data))
      if (quizResultsError) {
        setLoadError(quizResultsError.message)
        return
      }
      const results = Object.fromEntries(
        Object.entries(quizResults).map(([key, value]) => [key, value.result as KnowledgeAnswerResult]),
      )
      setAnswerResults(results)
      const params = new URLSearchParams(window.location.search)
      if (params.get('results') === '1') {
        window.history.replaceState(null, '', '/wissen')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [viewEpoch])

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <PageHeaderBar
          backHref="/"
          infoHref={areaInfoHref('/wissen')}
          infoLabel="Info zu Wissen"
        />

        <header className="mb-6 flex items-center gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-3xl ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:ring-emerald-800/60"
            aria-hidden
          >
            📚
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-50 dark:text-slate-100">Wissen</h1>
            <p className="text-sm text-white/82 dark:text-slate-400">3 kurze Fragen für heute</p>
          </div>
        </header>

        <div className="mb-4">
          <DailyXpProgressCard
            label="Wissens-XP heute"
            value={todayXp}
            max={XP_LIMITS.wissen}
            target={xpTargetForCategory('wissen', XP_LIMITS.wissen)}
            icon="📚"
            errorMessage={xpError}
          />
        </div>

        <p className="mb-4 text-sm text-white/85 dark:text-slate-400">
          Tippe auf eine Frage — du kommst zur Antwort und den XP.
        </p>

        {loadError ? (
          <p
            className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {loadError}
          </p>
        ) : loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Fragen werden geladen …</p>
        ) : questions.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Aktuell keine Fragen in der Datenbank.</p>
        ) : (
          <div className="flex flex-col gap-3" role="list">
            {questions.map((question, i) => {
              const result = answerResults[question.key]
              const doneQuery = answeredSlotsQuery(questions, answerResults)
              const resultClasses =
                result === 'correct'
                  ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-950 ring-emerald-200/80 dark:border-emerald-600 dark:from-emerald-950/60 dark:to-teal-950/45 dark:text-emerald-100 dark:ring-emerald-800/60'
                  : result === 'wrong'
                    ? 'border-red-300 bg-red-50/70 text-red-950 ring-red-200/60 dark:border-red-800 dark:bg-red-950/25 dark:text-red-100 dark:ring-red-900/45'
                    : 'border-yellow-300 bg-yellow-50/75 text-amber-950 ring-yellow-200/60 dark:border-yellow-700 dark:bg-yellow-950/25 dark:text-yellow-100 dark:ring-yellow-900/40'
              return (
                <Link
                  key={question.key}
                  href={`/wissen/frage?slot=${i}${doneQuery}`}
                  className={`lifexp-pressable-3d group flex w-full items-start gap-4 rounded-2xl border-2 p-4 text-left ring-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${resultClasses}`}
                >
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100/90 text-2xl shadow-inner ring-2 ring-slate-300/80 ring-inset dark:bg-slate-950/30 dark:ring-slate-700/80"
                    aria-hidden
                  >
                    {FRAGE_EMOJI[i] ?? '❓'}
                  </span>
                  <span className="min-w-0 flex-1 pt-0.5">
                    <span className="block text-lg font-bold tracking-tight">Frage {i + 1}</span>
                    <span className="mt-0.5 block text-sm leading-snug opacity-75">
                      {questionPreview(question.row)}
                    </span>
                  </span>
                  <span className="mt-2 shrink-0 opacity-45 transition group-hover:opacity-80" aria-hidden>
                    →
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
