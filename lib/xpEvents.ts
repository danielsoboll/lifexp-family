import { getActiveEventDate } from './activeEventDate'
import { getLocalDateKey, normalizeDateKey } from './cetDate'
import { requestHomeXpCelebration, type XpCategory, type XpByCategory } from './storage'
import { resetCurrentProfileXp, updateCurrentProfileXp } from './profile'
import { supabase } from './supabase'
import { getActiveUserId } from './user'
import { notifyXpHistoryRefresh } from './xpHistoryRefresh'

/** @deprecated Nur noch für Alt-Daten ohne Onboarding-Username. */
export const DEMO_USER_ID = 'demo-user'

function activeUserId(): string | null {
  return getActiveUserId()
}

export type DailyXpEventCategory = 'bewegung' | 'ernaehrung' | 'wissen' | 'mein_tag' | 'plus'
export type XpEventCategory = DailyXpEventCategory | 'liga'

export type TodayXpByCategory = XpByCategory & {
  wissen: number
}

export type QuizAnswerStatus = {
  result: 'correct' | 'wrong'
  selectedAnswer: string
  correctAnswer: string
  xp: number
}

type XpEventRow = {
  category: XpEventCategory
  xp: number
}

type QuizAnswerRow = {
  xp: number
  metadata: Record<string, unknown> | null
}

type LatestSelectionRow = {
  xp: number
  metadata: Record<string, unknown> | null
}

type RecordXpEventInput = {
  category: XpEventCategory
  source: string
  xp: number
  metadata?: Record<string, unknown>
  celebrate?: boolean
}

type QuizAnswerEntry = {
  slot: number
  is_correct: boolean
  selected_answer: string
  correct_answer: string
}

function resolveStoredXp(amount: number, metadata: Record<string, unknown>): number {
  const selectedXp = metadata.selected_xp
  if (typeof selectedXp === 'number' && Number.isFinite(selectedXp)) {
    return Math.floor(selectedXp)
  }
  return Math.floor(amount)
}

function quizAnswersFromRows(rows: Array<{ metadata: Record<string, unknown> | null }>): Record<string, QuizAnswerEntry> {
  const answers: Record<string, QuizAnswerEntry> = {}
  for (const row of rows) {
    const metadata = row.metadata ?? {}
    const nested = metadata.answers
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      for (const [questionKey, value] of Object.entries(nested as Record<string, unknown>)) {
        if (!questionKey || !value || typeof value !== 'object' || Array.isArray(value)) continue
        const entry = value as Record<string, unknown>
        answers[questionKey] = {
          slot: typeof entry.slot === 'number' && Number.isFinite(entry.slot) ? Math.floor(entry.slot) : 0,
          is_correct: entry.is_correct === true,
          selected_answer: typeof entry.selected_answer === 'string' ? entry.selected_answer : '',
          correct_answer: typeof entry.correct_answer === 'string' ? entry.correct_answer : '',
        }
      }
      continue
    }
    const legacyKey = typeof metadata.questionKey === 'string' ? metadata.questionKey : ''
    if (!legacyKey) continue
    answers[legacyKey] = {
      slot: typeof metadata.slot === 'number' && Number.isFinite(metadata.slot) ? Math.floor(metadata.slot) : 0,
      is_correct: metadata.is_correct === true,
      selected_answer: typeof metadata.selected_answer === 'string' ? metadata.selected_answer : '',
      correct_answer: typeof metadata.correct_answer === 'string' ? metadata.correct_answer : '',
    }
  }
  return answers
}

function countCorrectQuizAnswers(answers: Record<string, QuizAnswerEntry>): number {
  return Object.values(answers).filter((entry) => entry.is_correct).length
}

async function upsertXpEventForSource({
  category,
  source,
  xp,
  metadata = {},
  celebrate = false,
}: RecordXpEventInput): Promise<{ updated: boolean; error: Error | null }> {
  const userId = activeUserId()
  if (!userId) {
    return { updated: false, error: new Error('Kein Benutzer. Bitte Onboarding abschließen.') }
  }

  const eventDate = activeEventDateKey()
  const amount = resolveStoredXp(xp, metadata)
  const eventPayload = {
    xp: amount,
    metadata: {
      ...metadata,
      updated_at: new Date().toISOString(),
    },
  }

  const { data: existingRows, error: fetchError } = await supabase
    .from('xp_events')
    .select('id')
    .eq('user_id', userId)
    .eq('event_date', eventDate)
    .eq('category', category)
    .eq('source', source)
    .order('created_at', { ascending: false })

  if (fetchError) {
    return { updated: false, error: new Error(fetchError.message) }
  }

  const rows = Array.isArray(existingRows) ? existingRows : []
  const primaryRow = rows[0]
  const primaryId =
    primaryRow && typeof primaryRow === 'object' && typeof (primaryRow as { id?: unknown }).id === 'number'
      ? Math.floor((primaryRow as { id: number }).id)
      : 0

  const { total: totalBefore, error: totalBeforeError } = await fetchTotalXp()
  if (totalBeforeError) {
    return { updated: false, error: totalBeforeError }
  }

  if (primaryId > 0) {
    const { error: updateError } = await supabase
      .from('xp_events')
      .update(eventPayload)
      .eq('id', primaryId)

    if (updateError) {
      return { updated: false, error: new Error(updateError.message) }
    }

    const duplicateIds = rows
      .slice(1)
      .map((row) =>
        row && typeof row === 'object' && typeof (row as { id?: unknown }).id === 'number'
          ? Math.floor((row as { id: number }).id)
          : 0,
      )
      .filter((id) => id > 0)

    if (duplicateIds.length > 0) {
      const { error: dedupeError } = await supabase.from('xp_events').delete().in('id', duplicateIds)
      if (dedupeError) {
        return { updated: false, error: new Error(dedupeError.message) }
      }
    }
  } else {
    const { error: insertError } = await supabase.from('xp_events').insert({
      user_id: userId,
      category,
      source,
      event_date: eventDate,
      ...eventPayload,
    })

    if (insertError) {
      return { updated: false, error: new Error(insertError.message) }
    }
  }

  const { total: totalAfter, error: totalError } = await fetchTotalXp()
  if (totalError) {
    return { updated: false, error: totalError }
  }

  const { error: profileError } = await updateCurrentProfileXp(totalAfter)
  if (profileError) {
    return { updated: false, error: profileError }
  }

  const shouldCelebrate = celebrate && eventDate === getLocalDateKey()
  if (shouldCelebrate && countsTowardTotalXp(category) && totalAfter > totalBefore) {
    requestHomeXpCelebration()
  }

  notifyXpHistoryRefresh()
  return { updated: primaryId > 0, error: null }
}

/** Aktueller Ansichtstag (heute oder „Gestern“-Modus) in CET — siehe lib/cetDate.ts. */
export function todayEventDate(): string {
  return getActiveEventDate()
}

function activeEventDateKey(): string {
  return normalizeDateKey(todayEventDate())
}

export function xpEventCategoryFromAppCategory(category: XpCategory): DailyXpEventCategory {
  return category === 'meinTag' ? 'mein_tag' : category
}

export function emptyTodayXp(): TodayXpByCategory {
  return { bewegung: 0, ernaehrung: 0, wissen: 0, meinTag: 0, plus: 0 }
}

function countsTowardTotalXp(category: XpEventCategory): boolean {
  return category.length > 0
}

function addRowToTotals(totals: TodayXpByCategory, row: XpEventRow) {
  const xp = typeof row.xp === 'number' && Number.isFinite(row.xp) ? row.xp : 0
  if (row.category === 'liga') return
  if (row.category === 'mein_tag') {
    totals.meinTag += xp
    return
  }
  totals[row.category] += xp
}

export async function recordXpEvent({
  category,
  source,
  xp,
  metadata = {},
  celebrate = true,
}: RecordXpEventInput): Promise<{ error: Error | null }> {
  const { error } = await upsertXpEventForSource({
    category,
    source,
    xp,
    metadata,
    celebrate,
  })
  return { error }
}

/**
 * Quiz: genau ein Eintrag pro Tag (`source = quiz`), XP = Anzahl richtiger Antworten.
 * Bestehende Alt-Einträge werden zusammengeführt und Duplikate entfernt.
 */
export async function recordQuizAnswer({
  questionKey,
  slot,
  isCorrect,
  selectedAnswer,
  correctAnswer,
}: {
  questionKey: string
  slot: number
  isCorrect: boolean
  selectedAnswer: string
  correctAnswer: string
}): Promise<{ totalCorrect: number; error: Error | null }> {
  if (!questionKey.trim()) {
    return { totalCorrect: 0, error: new Error('Quiz-Frage konnte nicht zugeordnet werden.') }
  }

  const userId = activeUserId()
  if (!userId) {
    return { totalCorrect: 0, error: new Error('Kein Benutzer. Bitte Onboarding abschließen.') }
  }

  const eventDate = activeEventDateKey()
  const category: DailyXpEventCategory = 'wissen'
  const source = 'quiz'

  const { data: existingRows, error: fetchError } = await supabase
    .from('xp_events')
    .select('id,metadata')
    .eq('user_id', userId)
    .eq('event_date', eventDate)
    .eq('category', category)
    .eq('source', source)
    .order('created_at', { ascending: false })

  if (fetchError) {
    return { totalCorrect: 0, error: new Error(fetchError.message) }
  }

  const rows = (Array.isArray(existingRows) ? existingRows : []) as Array<{
    id?: unknown
    metadata?: Record<string, unknown> | null
  }>
  const answers = quizAnswersFromRows(rows.map((row) => ({ metadata: row.metadata ?? null })))
  answers[questionKey] = {
    slot,
    is_correct: isCorrect,
    selected_answer: selectedAnswer,
    correct_answer: correctAnswer,
  }
  const totalCorrect = countCorrectQuizAnswers(answers)

  const { error } = await upsertXpEventForSource({
    category,
    source,
    xp: totalCorrect,
    metadata: { answers },
    celebrate: isCorrect,
  })
  return { totalCorrect, error }
}

/**
 * Ein Event pro Tag/Kategorie/Quelle: bei erneutem Drücken aktualisieren (XP + metadata).
 * Doppelte Alt-Einträge für dieselbe Quelle werden entfernt.
 */
export async function upsertTodayXpEventForSource({
  category,
  source,
  xp,
  metadata = {},
  celebrate = false,
}: RecordXpEventInput): Promise<{ updated: boolean; error: Error | null }> {
  return upsertXpEventForSource({ category, source, xp, metadata, celebrate })
}

export async function fetchLatestTodaySelection({
  category,
  source,
}: {
  category: XpEventCategory
  source: string
}): Promise<{
  selection: { label: string; selectedXp: number; metadata: Record<string, unknown> } | null
  error: Error | null
}> {
  const eventDate = activeEventDateKey()
  const { data, error } = await supabase
    .from('xp_events')
    .select('xp,metadata')
    .eq('user_id', activeUserId() ?? DEMO_USER_ID)
    .eq('event_date', eventDate)
    .eq('category', category)
    .eq('source', source)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { selection: null, error: new Error(error.message) }
  }
  if (!data) {
    return { selection: null, error: null }
  }

  const row = data as LatestSelectionRow
  const metadata = row.metadata ?? {}
  const label = typeof metadata.label === 'string' ? metadata.label : ''
  const selectedXpRaw = metadata.selected_xp
  const selectedXp =
    typeof selectedXpRaw === 'number' && Number.isFinite(selectedXpRaw)
      ? Math.floor(selectedXpRaw)
      : typeof row.xp === 'number' && Number.isFinite(row.xp)
        ? Math.floor(row.xp)
        : 0

  return {
    selection: label ? { label, selectedXp, metadata } : null,
    error: null,
  }
}

export async function fetchTotalXp(): Promise<{ total: number; error: Error | null }> {
  const { data, error } = await supabase
    .from('xp_events')
    .select('xp')
    .eq('user_id', activeUserId() ?? DEMO_USER_ID)

  if (error) {
    return { total: 0, error: new Error(error.message) }
  }

  const total = (Array.isArray(data) ? data : []).reduce((sum, row) => {
    const xp = (row as { xp?: unknown }).xp
    return sum + (typeof xp === 'number' && Number.isFinite(xp) ? xp : 0)
  }, 0)
  return { total, error: null }
}

export async function syncProfileXpFromEvents(): Promise<{ total: number; error: Error | null }> {
  const { total, error } = await fetchTotalXp()
  if (error) {
    return { total: 0, error }
  }
  const { error: profileError } = await updateCurrentProfileXp(total)
  return { total, error: profileError }
}

/** Summe der zählbaren Tages-XP für ein festes Kalenderdatum (z. B. immer heute für den Avatar). */
export async function fetchDailyXpTotalForDate(eventDate: string): Promise<{ total: number; error: Error | null }> {
  const dateKey = normalizeDateKey(eventDate)
  const { data, error } = await supabase
    .from('xp_events')
    .select('category,xp')
    .eq('user_id', activeUserId() ?? DEMO_USER_ID)
    .eq('event_date', dateKey)

  if (error) {
    return { total: 0, error: new Error(error.message) }
  }

  const total = ((Array.isArray(data) ? data : []) as XpEventRow[]).reduce((sum, row) => {
    const xp = typeof row.xp === 'number' && Number.isFinite(row.xp) ? row.xp : 0
    return countsTowardTotalXp(row.category) ? sum + xp : sum
  }, 0)
  return { total, error: null }
}

export async function fetchTodayTotalXp(): Promise<{ total: number; error: Error | null }> {
  return fetchDailyXpTotalForDate(todayEventDate())
}

/** Tages-XP für heute (CET), unabhängig vom „Gestern“-Ansichtsmodus (Avatar-Ring). */
export async function fetchCetTodayDailyTotalXp(): Promise<{ total: number; error: Error | null }> {
  return fetchDailyXpTotalForDate(getLocalDateKey())
}

/** @deprecated Liga-Stand liegt in `profiles.league_stand` — {@link fetchCurrentLeagueStatus} nutzen. */
export async function fetchLigaXpStatus(): Promise<{
  total: number
  claimedToday: boolean
  error: Error | null
}> {
  const { fetchCurrentLeagueStatus } = await import('./leagueXp')
  const [{ stand, error: leagueError }, loginCheck] = await Promise.all([
    fetchCurrentLeagueStatus(),
    fetchTodayHasEventForCategorySource({ category: 'plus', source: 'login' }),
  ])
  if (leagueError) {
    return { total: 0, claimedToday: false, error: leagueError }
  }
  return {
    total: stand,
    claimedToday: loginCheck.hasEvent,
    error: loginCheck.error,
  }
}

export async function fetchTodayXpByCategory(): Promise<{
  xp: TodayXpByCategory
  error: Error | null
}> {
  const eventDate = activeEventDateKey()
  const { data, error } = await supabase
    .from('xp_events')
    .select('category,xp')
    .eq('user_id', activeUserId() ?? DEMO_USER_ID)
    .eq('event_date', eventDate)

  if (error) {
    return { xp: emptyTodayXp(), error: new Error(error.message) }
  }

  const totals = emptyTodayXp()
  for (const row of (Array.isArray(data) ? data : []) as XpEventRow[]) {
    addRowToTotals(totals, row)
  }
  return { xp: totals, error: null }
}

export async function fetchTodayQuizAnswerResults(): Promise<{
  results: Record<string, QuizAnswerStatus>
  error: Error | null
}> {
  const eventDate = activeEventDateKey()
  const { data, error } = await supabase
    .from('xp_events')
    .select('xp,metadata')
    .eq('user_id', activeUserId() ?? DEMO_USER_ID)
    .eq('event_date', eventDate)
    .eq('category', 'wissen')
    .eq('source', 'quiz')
    .order('created_at', { ascending: true })

  if (error) {
    return { results: {}, error: new Error(error.message) }
  }

  const rows = (Array.isArray(data) ? data : []) as QuizAnswerRow[]
  const answers = quizAnswersFromRows(rows.map((row) => ({ metadata: row.metadata ?? null })))
  const results: Record<string, QuizAnswerStatus> = {}
  for (const [questionKey, entry] of Object.entries(answers)) {
    results[questionKey] = {
      result: entry.is_correct ? 'correct' : 'wrong',
      selectedAnswer: entry.selected_answer,
      correctAnswer: entry.correct_answer,
      xp: entry.is_correct ? 1 : 0,
    }
  }
  return { results, error: null }
}

function sumSignedEventXp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value)
  return 0
}

/** Summe aller XP-Events einer Kategorie für ein festes event_date. */
export async function fetchCategoryXpForEventDate(
  category: XpEventCategory,
  eventDate: string,
): Promise<{ xp: number; error: Error | null }> {
  const dateKey = normalizeDateKey(eventDate)
  const { data, error } = await supabase
    .from('xp_events')
    .select('xp')
    .eq('user_id', activeUserId() ?? DEMO_USER_ID)
    .eq('event_date', dateKey)
    .eq('category', category)

  if (error) {
    return { xp: 0, error: new Error(error.message) }
  }

  const xp = (Array.isArray(data) ? data : []).reduce(
    (sum, row) => sum + sumSignedEventXp((row as { xp?: unknown }).xp),
    0,
  )
  return { xp, error: null }
}

/** Summe pro event_date für einen Datumsbereich (inklusive). */
export async function fetchCategoryXpTotalsByDateRange(
  category: DailyXpEventCategory,
  startDate: string,
  endDate: string,
): Promise<{ totalsByDate: Map<string, number>; error: Error | null }> {
  const userId = activeUserId()
  if (!userId) {
    return { totalsByDate: new Map(), error: new Error('Kein Benutzer. Bitte Onboarding abschließen.') }
  }

  const startKey = normalizeDateKey(startDate)
  const endKey = normalizeDateKey(endDate)
  const { data, error } = await supabase
    .from('xp_events')
    .select('event_date,xp')
    .eq('user_id', userId)
    .eq('category', category)
    .gte('event_date', startKey)
    .lte('event_date', endKey)

  if (error) {
    return { totalsByDate: new Map(), error: new Error(error.message) }
  }

  const totalsByDate = new Map<string, number>()
  for (const row of data ?? []) {
    if (!row || typeof row !== 'object') continue
    const record = row as Record<string, unknown>
    const date = normalizeDateKey(record.event_date)
    if (!date) continue
    totalsByDate.set(date, (totalsByDate.get(date) ?? 0) + sumSignedEventXp(record.xp))
  }
  return { totalsByDate, error: null }
}

export async function fetchTodayXpForCategory(
  category: XpEventCategory,
): Promise<{ xp: number; error: Error | null }> {
  return fetchCategoryXpForEventDate(category, todayEventDate())
}

export async function fetchTodayHasEventForCategory(
  category: XpEventCategory,
): Promise<{ hasEvent: boolean; error: Error | null }> {
  const eventDate = activeEventDateKey()
  const { data, error } = await supabase
    .from('xp_events')
    .select('id')
    .eq('user_id', activeUserId() ?? DEMO_USER_ID)
    .eq('event_date', eventDate)
    .eq('category', category)
    .limit(1)

  if (error) {
    return { hasEvent: false, error: new Error(error.message) }
  }

  return { hasEvent: Array.isArray(data) && data.length > 0, error: null }
}

export async function fetchTodayHasEventForCategorySource({
  category,
  source,
}: {
  category: XpEventCategory
  source: string
}): Promise<{ hasEvent: boolean; error: Error | null }> {
  const eventDate = activeEventDateKey()
  const { data, error } = await supabase
    .from('xp_events')
    .select('id')
    .eq('user_id', activeUserId() ?? DEMO_USER_ID)
    .eq('event_date', eventDate)
    .eq('category', category)
    .eq('source', source)
    .limit(1)

  if (error) {
    return { hasEvent: false, error: new Error(error.message) }
  }

  return { hasEvent: Array.isArray(data) && data.length > 0, error: null }
}

export async function fetchHasEventForCategorySourceOnDate({
  category,
  source,
  eventDate,
}: {
  category: XpEventCategory
  source: string
  eventDate: string
}): Promise<{ hasEvent: boolean; error: Error | null }> {
  const dateKey = normalizeDateKey(eventDate)
  const { data, error } = await supabase
    .from('xp_events')
    .select('id')
    .eq('user_id', activeUserId() ?? DEMO_USER_ID)
    .eq('event_date', dateKey)
    .eq('category', category)
    .eq('source', source)
    .limit(1)

  if (error) {
    return { hasEvent: false, error: new Error(error.message) }
  }

  return { hasEvent: Array.isArray(data) && data.length > 0, error: null }
}

export async function deleteXpEventsForSource(source: string): Promise<{ error: Error | null }> {
  const userId = activeUserId()
  if (!userId) {
    return { error: new Error('Kein Benutzer. Bitte Onboarding abschließen.') }
  }

  const { error } = await supabase.from('xp_events').delete().eq('user_id', userId).eq('source', source)

  if (error) {
    return { error: new Error(error.message) }
  }

  notifyXpHistoryRefresh()
  return syncProfileXpFromEvents()
}

export async function deleteTodayXpEventsForCategorySources({
  category,
  sources,
}: {
  category: XpEventCategory
  sources: string[]
}): Promise<{ error: Error | null }> {
  if (sources.length === 0) return { error: null }

  const eventDate = activeEventDateKey()
  const { error } = await supabase
    .from('xp_events')
    .delete()
    .eq('user_id', activeUserId() ?? DEMO_USER_ID)
    .eq('event_date', eventDate)
    .eq('category', category)
    .in('source', sources)

  if (error) {
    return { error: new Error(error.message) }
  }

  const { total, error: totalError } = await fetchTotalXp()
  if (totalError) {
    return { error: totalError }
  }
  const result = await updateCurrentProfileXp(total)
  if (!result.error) notifyXpHistoryRefresh()
  return result
}

export async function deleteAllXpEventsForActiveUser(): Promise<{ error: Error | null }> {
  const userId = activeUserId()
  if (!userId) return { error: null }

  const { error } = await supabase.from('xp_events').delete().eq('user_id', userId)
  return { error: error ? new Error(error.message) : null }
}

/** @deprecated Nutze `resetAllXpProgressData` aus `lib/accountReset`. */
export async function resetDemoXpEvents(): Promise<{ error: Error | null }> {
  const { error } = await deleteAllXpEventsForActiveUser()
  if (error) return { error }
  return resetCurrentProfileXp()
}
