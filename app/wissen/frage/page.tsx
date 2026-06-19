'use client'

import Link from 'next/link'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import PageHeaderBar from '../../../components/PageHeaderBar'
import { areaInfoHref } from '../../../lib/areaInfoNav'
import { MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS } from '../../../lib/appShell'
import {
  getDailyKnowledgeQuestions,
  type KnowledgeRoundQuestion,
} from '../../../lib/knowledgeRound'
import {
  fetchKnowledgeQuestions,
  knowledgeQuestionCategoryLabel,
  knowledgeQuestionDisplayText,
  knowledgeQuestionXpAmount,
  type KnowledgeQuestionRow,
} from '../../../lib/supabase'
import { LIFEXP_VIEW_DATE_CHANGED_EVENT } from '../../../lib/activeEventDate'
import { fetchTodayQuizAnswerResults, fetchTodayXpForCategory, recordQuizAnswer } from '../../../lib/xpEvents'

type AnswerOption = {
  text: string
  isCorrect: boolean
}

/** Kurz warten, bevor Antworten klickbar sind (neue Frage). */
const ANSWER_INPUT_FREEZE_MS = 1000

function valueAsText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function shuffledAnswerOptions(row: KnowledgeQuestionRow): AnswerOption[] {
  const correctAnswer = valueAsText(row.correct_answer)
  const wrongAnswer1 = valueAsText(row.wrong_answer_1)
  const wrongAnswer2 = valueAsText(row.wron_answer_2 ?? row.wrong_answer_2)

  return [
    { text: correctAnswer, isCorrect: true },
    { text: wrongAnswer1, isCorrect: false },
    { text: wrongAnswer2, isCorrect: false },
  ]
    .filter((option) => option.text.length > 0)
    .sort(() => Math.random() - 0.5)
}

function parseAnsweredSlots(value: string | null): Set<number> {
  if (!value) return new Set()
  return new Set(
    value
      .split(',')
      .map((slot) => parseInt(slot, 10))
      .filter((slot) => Number.isInteger(slot) && slot >= 0 && slot <= 2),
  )
}

function playCorrectAnswerPling() {
  const AudioContextConstructor =
    window.AudioContext ??
    (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextConstructor) return

  const audioContext = new AudioContextConstructor()
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()
  const now = audioContext.currentTime

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(880, now)
  oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.09)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)

  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start(now)
  oscillator.stop(now + 0.3)
  oscillator.addEventListener('ended', () => {
    void audioContext.close()
  })
}

function WissenFrageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const slotRaw = searchParams.get('slot') ?? searchParams.get('idx')
  const doneParam = searchParams.get('done')
  const slot = Math.min(2, Math.max(0, parseInt(slotRaw ?? '0', 10) || 0))

  const [question, setQuestion] = useState<KnowledgeRoundQuestion | null>(null)
  const [questions, setQuestions] = useState<KnowledgeRoundQuestion[]>([])
  const [row, setRow] = useState<KnowledgeQuestionRow | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [knowledgeXp, setKnowledgeXp] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null)
  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>([])
  const [showCorrectReward, setShowCorrectReward] = useState(false)
  const rewardTimeoutRef = useRef<number | null>(null)
  const answerFreezeTimerRef = useRef<number | null>(null)
  const [inputsFrozen, setInputsFrozen] = useState(true)
  const [answeredSlots, setAnsweredSlots] = useState<Set<number>>(() =>
    parseAnsweredSlots(searchParams.get('done')),
  )
  const [viewEpoch, setViewEpoch] = useState(0)

  useEffect(() => {
    const bump = () => setViewEpoch((n) => n + 1)
    window.addEventListener(LIFEXP_VIEW_DATE_CHANGED_EVENT, bump)
    return () => window.removeEventListener(LIFEXP_VIEW_DATE_CHANGED_EVENT, bump)
  }, [])

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- neue Frage soll sofort wieder Ladezustand zeigen
    setLoading(true)
    setLoadError(null)
    setQuestion(null)
    setQuestions([])
    setRow(null)
    setAnswered(false)
    setSubmitted(false)
    setSelectedAnswerIndex(null)
    setAnswerOptions([])
    setShowCorrectReward(false)
    setInputsFrozen(true)
    void (async () => {
      const [{ rows, error }, { results: quizResults, error: quizResultsError }] = await Promise.all([
        fetchKnowledgeQuestions(20),
        fetchTodayQuizAnswerResults(),
      ])
      if (cancelled) return
      setLoading(false)
      if (error) {
        setLoadError(error.message)
        setRow(null)
        return
      }
      if (quizResultsError) {
        setLoadError(quizResultsError.message)
        setRow(null)
        return
      }
      setLoadError(null)
      const dailyQuestions = getDailyKnowledgeQuestions(rows)
      const picked = dailyQuestions[slot] ?? null
      const doneFromUrl = parseAnsweredSlots(doneParam)
      const doneFromResults = dailyQuestions
        .map((question, questionSlot) => (quizResults[question.key] ? questionSlot : null))
        .filter((questionSlot): questionSlot is number => questionSlot !== null)
      setQuestions(dailyQuestions)
      setAnsweredSlots(new Set([...doneFromUrl, ...doneFromResults]))
      setQuestion(picked)
      setRow(picked?.row ?? null)
      if (picked) {
        const { xp } = await fetchTodayXpForCategory('wissen')
        if (!cancelled) setKnowledgeXp(xp)
        const options = shuffledAnswerOptions(picked.row)
        setAnswerOptions(options)
        const existingAnswer = quizResults[picked.key]
        if (existingAnswer) {
          const selectedIndex = options.findIndex((option) => option.text === existingAnswer.selectedAnswer)
          setAnswered(true)
          setSelectedAnswerIndex(selectedIndex >= 0 ? selectedIndex : null)
          setInputsFrozen(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [doneParam, slot, viewEpoch])

  useEffect(() => {
    if (loading || answered || answerOptions.length === 0) {
      return
    }

    setInputsFrozen(true)
    if (answerFreezeTimerRef.current !== null) {
      window.clearTimeout(answerFreezeTimerRef.current)
    }
    answerFreezeTimerRef.current = window.setTimeout(() => {
      answerFreezeTimerRef.current = null
      setInputsFrozen(false)
    }, ANSWER_INPUT_FREEZE_MS)

    return () => {
      if (answerFreezeTimerRef.current !== null) {
        window.clearTimeout(answerFreezeTimerRef.current)
        answerFreezeTimerRef.current = null
      }
    }
  }, [loading, answered, answerOptions, question?.key])

  useEffect(() => {
    return () => {
      if (rewardTimeoutRef.current !== null) {
        window.clearTimeout(rewardTimeoutRef.current)
      }
      if (answerFreezeTimerRef.current !== null) {
        window.clearTimeout(answerFreezeTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!submitted) return
    const currentHref = window.location.href
    window.history.pushState({ lifexpLocked: true }, '', currentHref)
    const keepUserHere = () => {
      window.history.pushState({ lifexpLocked: true }, '', currentHref)
    }
    window.addEventListener('popstate', keepUserHere)
    const t = window.setTimeout(() => {
      const nextSlot = questions.findIndex((_, questionSlot) => questionSlot > slot && !answeredSlots.has(questionSlot))
      const done = [...answeredSlots].sort().join(',')
      const doneQuery = done ? `&done=${done}` : ''
      router.push(nextSlot >= 0 ? `/wissen/frage?slot=${nextSlot}${doneQuery}` : '/wissen?results=1')
    }, 2000)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('popstate', keepUserHere)
    }
  }, [submitted, answeredSlots, questions, router, slot])

  const categoryLabel = knowledgeQuestionCategoryLabel(row)
  const questionText = knowledgeQuestionDisplayText(row)
  const xpAmount = knowledgeQuestionXpAmount(row)

  const onAnswer = async (option: AnswerOption, index: number) => {
    if (inputsFrozen || answered || !row) return
    const correctAnswer = valueAsText(row.correct_answer)
    const { totalCorrect, error } = await recordQuizAnswer({
      questionKey: question?.key ?? '',
      slot,
      isCorrect: option.isCorrect,
      selectedAnswer: option.text,
      correctAnswer,
    })
    if (error) {
      setLoadError(error.message)
      return
    }
    setSelectedAnswerIndex(index)
    setAnswered(true)
    setSubmitted(true)
    setAnsweredSlots((prev) => {
      const next = new Set(prev)
      next.add(slot)
      return next
    })
    setKnowledgeXp(totalCorrect)
    if (option.isCorrect) {
      playCorrectAnswerPling()
      setShowCorrectReward(true)
      if (rewardTimeoutRef.current !== null) {
        window.clearTimeout(rewardTimeoutRef.current)
      }
      rewardTimeoutRef.current = window.setTimeout(() => {
        setShowCorrectReward(false)
        rewardTimeoutRef.current = null
      }, 500)
    }
  }

  return (
    <>
      <PageHeaderBar
        backHref="/wissen"
        infoHref={areaInfoHref('/wissen/frage')}
        infoLabel="Info zu Wissen"
      />

      <header className="mb-4 flex items-center gap-3">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-3xl ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:ring-emerald-800/60"
          aria-hidden
        >
          📚
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Frage {slot + 1}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Wissen</p>
        </div>
      </header>

      {loadError ? (
        <p
          className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {loadError}
        </p>
      ) : loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Frage wird geladen …</p>
      ) : !row ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Diese Frage gibt es nicht.{' '}
          <Link href="/wissen" className="font-semibold text-emerald-700 underline dark:text-emerald-400">
            Zur Übersicht
          </Link>
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Kategorie
          </p>
          <p className="mb-4 inline-flex w-fit rounded-full border-2 border-emerald-200/90 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 dark:border-emerald-800/70 dark:bg-emerald-950/55 dark:text-emerald-100">
            {categoryLabel}
          </p>

          <section
            className="rounded-2xl border-2 border-slate-400/85 bg-slate-100 p-3.5 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.1)] ring-1 ring-slate-900/5 backdrop-blur-sm dark:border-slate-600 dark:bg-slate-900/90 dark:ring-slate-700/50"
            aria-labelledby="wissen-frage"
          >
            <h2 id="wissen-frage" className="sr-only">
              Frage
            </h2>
            <div className="mb-2 flex items-start justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Frage</p>
              <div className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-right dark:border-emerald-800/70 dark:bg-emerald-950/55">
                <p className="text-[10px] font-semibold uppercase leading-none tracking-wide text-emerald-800 dark:text-emerald-300">
                  Wissen
                </p>
                <p className="mt-0.5 text-sm font-bold leading-none tabular-nums text-emerald-700 dark:text-emerald-300">
                  +{xpAmount} XP
                </p>
              </div>
            </div>
            <p className="text-base font-medium leading-snug text-slate-900 dark:text-slate-100">
              {questionText || '—'}
            </p>
          </section>

          <section className="mt-4" aria-label="Antworten">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Antwort wählen
            </p>
            {answerOptions.length === 0 ? (
              <p className="rounded-2xl border-2 border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-amber-900 dark:border-yellow-900/50 dark:bg-yellow-950/30 dark:text-yellow-100">
                Für diese Frage sind noch keine Antworten hinterlegt.
              </p>
            ) : (
              <div className="flex flex-col gap-3.5">
                {answerOptions.map((option, optionIndex) => {
                  const selected = selectedAnswerIndex === optionIndex
                  const showCorrect = answered && option.isCorrect
                  const showWrong = selected && answered && !option.isCorrect
                  return (
                    <button
                      key={`${option.text}-${optionIndex}`}
                      type="button"
                      onClick={() => {
                        if (inputsFrozen) return
                        void onAnswer(option, optionIndex)
                      }}
                      disabled={answered}
                      className={`lifexp-pressable-3d min-h-[3.1rem] w-full rounded-xl border-2 px-3.5 py-2.5 text-left text-sm font-semibold leading-snug ring-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-default ${
                        showCorrect
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-emerald-200/80 dark:border-emerald-500 dark:bg-emerald-950/45 dark:text-emerald-100 dark:ring-emerald-800/60'
                          : showWrong
                            ? 'border-red-400 bg-red-50 text-red-950 ring-red-200/80 dark:border-red-700 dark:bg-red-950/45 dark:text-red-100 dark:ring-red-900/60'
                            : 'border-stone-400/90 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/70 text-slate-900 ring-stone-500/18 hover:border-emerald-400/90 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-slate-100 dark:ring-stone-600/30 dark:hover:border-emerald-500/80'
                      }`}
                    >
                      {option.text}
                    </button>
                  )
                })}
              </div>
            )}

            {answered && selectedAnswerIndex !== null ? (
              answerOptions[selectedAnswerIndex]?.isCorrect ? (
                <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl border-2 border-emerald-200/90 bg-emerald-50/90 px-4 py-2 text-center text-xs font-medium text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100">
                  <p>
                    Richtig — {knowledgeXp} Wissens-XP heute
                    {submitted ? ' · Zurück zur Übersicht …' : ''}
                  </p>
                  {showCorrectReward ? (
                    <span
                      className="inline-flex h-6 w-6 animate-bounce items-center justify-center rounded-full border border-emerald-300 bg-white text-sm font-black text-emerald-600 shadow-lg dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      aria-label="Belohnung"
                    >
                      $
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-2 text-center text-xs font-medium text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
                  Leider falsch — keine XP
                  {submitted ? ' · Zurück zur Übersicht …' : ''}
                </p>
              )
            ) : null}
          </section>
        </>
      )}
    </>
  )
}

export default function WissenFragePage() {
  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <Suspense
          fallback={<p className="text-sm text-slate-500 dark:text-slate-400">Frage wird geladen …</p>}
        >
          <WissenFrageInner />
        </Suspense>
      </div>
    </main>
  )
}
