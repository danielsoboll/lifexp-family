import { getActiveEventDate } from './activeEventDate'
import type { KnowledgeQuestionRow } from './supabase'

export type KnowledgeAnswerResult = 'correct' | 'wrong'

export type KnowledgeRoundQuestion = {
  key: string
  row: KnowledgeQuestionRow
}

type RoundPayload = {
  keys: string[]
  results?: Record<string, KnowledgeAnswerResult>
}

/** @deprecated Nur Migration aus älterem Format. */
type LegacyStoredKnowledgeRound = {
  date: string
  keys: string[]
  results?: Record<string, KnowledgeAnswerResult>
}

type StoredRoundsByDate = Record<string, RoundPayload>

const STORAGE_KEY = 'lifexp-knowledge-round'
const ANSWER_RESULTS_KEY_PREFIX = 'lifexp-knowledge-answer-results'
const DAILY_QUESTION_COUNT = 3

function activeDateKey(): string {
  return getActiveEventDate()
}

function answerResultsSessionKey(date: string): string {
  return `${ANSWER_RESULTS_KEY_PREFIX}:${date}`
}

function isRoundPayload(value: unknown): value is RoundPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<RoundPayload>
  return (
    Array.isArray(payload.keys) &&
    payload.keys.every((key) => typeof key === 'string') &&
    (payload.results === undefined ||
      (typeof payload.results === 'object' && payload.results !== null))
  )
}

function readAllRounds(): StoredRoundsByDate {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)

    // Alt: ein einzelnes Objekt { date, keys, results } — nach Datum migrieren.
    if (parsed && typeof parsed === 'object' && 'date' in parsed) {
      const legacy = parsed as Partial<LegacyStoredKnowledgeRound>
      if (
        typeof legacy.date === 'string' &&
        Array.isArray(legacy.keys) &&
        legacy.keys.every((key) => typeof key === 'string')
      ) {
        const migrated: StoredRoundsByDate = {
          [legacy.date]: {
            keys: legacy.keys,
            results:
              legacy.results && typeof legacy.results === 'object'
                ? (legacy.results as Record<string, KnowledgeAnswerResult>)
                : {},
          },
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
        return migrated
      }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    const out: StoredRoundsByDate = {}
    for (const [date, payload] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof date === 'string' && isRoundPayload(payload)) {
        out[date] = payload
      }
    }
    return out
  } catch {
    return {}
  }
}

function writeAllRounds(rounds: StoredRoundsByDate) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rounds))
}

function readRound(date = activeDateKey()): RoundPayload | null {
  const all = readAllRounds()
  return all[date] ?? null
}

function writeRound(date: string, round: RoundPayload) {
  const all = readAllRounds()
  all[date] = round
  writeAllRounds(all)
}

function shuffle<T>(values: T[]): T[] {
  const next = [...values]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

export function knowledgeRowKey(row: KnowledgeQuestionRow, index: number): string {
  const key = row.id ?? row.uuid ?? row.question_id
  if (typeof key === 'string' && key.trim()) return key.trim()
  if (typeof key === 'number' && Number.isFinite(key)) return String(key)
  return `idx:${index}`
}

export function getDailyKnowledgeQuestions(rows: KnowledgeQuestionRow[]): KnowledgeRoundQuestion[] {
  const allQuestions = rows.map((row, index) => ({ key: knowledgeRowKey(row, index), row }))
  const date = activeDateKey()
  const stored = readRound(date)

  if (stored) {
    const byKey = new Map(allQuestions.map((question) => [question.key, question]))
    const roundKeys = stored.keys.slice(0, DAILY_QUESTION_COUNT)

    // Runde mit 3 Keys: nie neu mischen (auch nach Gestern/Heute-Wechsel).
    if (roundKeys.length >= DAILY_QUESTION_COUNT) {
      return roundKeys.map((key) => byKey.get(key) ?? { key, row: {} as KnowledgeQuestionRow })
    }

    const selected = roundKeys
      .map((key) => byKey.get(key))
      .filter((question): question is KnowledgeRoundQuestion => Boolean(question))

    if (selected.length >= Math.min(DAILY_QUESTION_COUNT, allQuestions.length)) {
      return selected.slice(0, DAILY_QUESTION_COUNT)
    }

    const selectedKeys = new Set(selected.map((question) => question.key))
    const fill = shuffle(allQuestions.filter((question) => !selectedKeys.has(question.key))).slice(
      0,
      DAILY_QUESTION_COUNT - selected.length,
    )
    const next = [...selected, ...fill]
    writeRound(date, { keys: next.map((question) => question.key), results: stored.results ?? {} })
    return next
  }

  const selected = shuffle(allQuestions).slice(0, DAILY_QUESTION_COUNT)
  writeRound(date, { keys: selected.map((question) => question.key) })
  return selected
}

/** Alle drei Tagesfragen beantwortet (DB + lokale Ergebnisse, stabil über gespeicherte Runden-Keys). */
export function isDailyKnowledgeComplete(
  quizResults: Record<string, unknown>,
  localQuizResults: Record<string, KnowledgeAnswerResult> = {},
): boolean {
  const date = activeDateKey()
  const stored = readRound(date)
  if (stored && stored.keys.length >= DAILY_QUESTION_COUNT) {
    const keys = stored.keys.slice(0, DAILY_QUESTION_COUNT)
    return keys.every((key) => Boolean(quizResults[key]) || Boolean(localQuizResults[key]))
  }
  return Object.keys(quizResults).length >= DAILY_QUESTION_COUNT
}

export function getKnowledgeAnswerResults(): Record<string, KnowledgeAnswerResult> {
  if (typeof window === 'undefined') return {}
  const date = activeDateKey()
  const stored = readRound(date)
  const storedResults = stored?.results ?? {}
  try {
    const raw = window.sessionStorage.getItem(answerResultsSessionKey(date))
    if (!raw) return storedResults
    const parsed = JSON.parse(raw) as Record<string, KnowledgeAnswerResult>
    if (!parsed || typeof parsed !== 'object') return storedResults
    return { ...storedResults, ...parsed }
  } catch {
    return storedResults
  }
}

export function clearKnowledgeAnswerResults() {
  if (typeof window === 'undefined') return
  const date = activeDateKey()
  window.sessionStorage.removeItem(answerResultsSessionKey(date))
  const stored = readRound(date)
  if (stored) {
    writeRound(date, { keys: stored.keys, results: {} })
  }
}

export function clearKnowledgeRoundState() {
  if (typeof window === 'undefined') return
  const prefix = `${ANSWER_RESULTS_KEY_PREFIX}:`
  for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
    const key = sessionStorage.key(i)
    if (key?.startsWith(prefix)) {
      sessionStorage.removeItem(key)
    }
  }
  window.localStorage.removeItem(STORAGE_KEY)
}

export function setKnowledgeAnswerResult(key: string, result: KnowledgeAnswerResult) {
  if (typeof window === 'undefined') return
  const date = activeDateKey()
  let results: Record<string, KnowledgeAnswerResult> = {}
  try {
    const raw = window.sessionStorage.getItem(answerResultsSessionKey(date))
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, KnowledgeAnswerResult>
      if (parsed && typeof parsed === 'object') results = parsed
    }
  } catch {
    /* ignore */
  }
  const nextResults = { ...results, [key]: result }
  window.sessionStorage.setItem(answerResultsSessionKey(date), JSON.stringify(nextResults))
  const stored = readRound(date)
  if (stored) {
    writeRound(date, {
      keys: stored.keys.includes(key) ? stored.keys : [...stored.keys, key],
      results: { ...(stored.results ?? {}), ...nextResults },
    })
  }
}
