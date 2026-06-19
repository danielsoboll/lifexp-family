import { cetToday, cetYesterday } from './cetDate'
import {
  calculateNutritionKcalMax,
  fetchNutritionRule,
  NUTRITION_PROTEIN_GOAL,
  type NutritionRule,
} from './nutrition'
import { fetchCurrentProfile, isAlcoholTrackingEnabled } from './profile'
import { XP_TARGETS } from './xpDisplay'
import { fetchDailyXpTotalForDate } from './xpEvents'
import { supabase } from './supabase'
import { getActiveUserId } from './user'

/** PostgreSQL `date` / CET-Kalendertag (`YYYY-MM-DD`). */
export type CetDateString = string

export type AlcStatus = 'low' | 'mid' | 'high'

export type DailyScoreYesNo = 'yes' | 'no'

type XpEventCategoryRow = {
  category?: unknown
  xp?: unknown
  metadata?: unknown
}

type MealTotalsRow = {
  kcal?: unknown
  protein?: unknown
}

type TaskXpRow = {
  xp_reward?: unknown
  completed_at?: unknown
}

export type DailyScorePayload = {
  user_id: string
  /** Gestern (CET), PostgreSQL `date`. */
  score_date: CetDateString
  /** Heute (CET), PostgreSQL `date` — Zeitpunkt der letzten Aggregation. */
  updated_at: CetDateString
  total_xp: number
  movement_xp: number
  nutrition_xp: number
  knowledge_xp: number
  day_xp: number
  plus_xp: number
  calories: number
  protein: number
  alc_status: AlcStatus | null
  tasks_plan: number
  tasks_done: number
  streak_done: DailyScoreYesNo
  total_xp_ok: DailyScoreYesNo
  movement_xp_ok: DailyScoreYesNo
  nutrition_xp_ok: DailyScoreYesNo
  day_xp_ok: DailyScoreYesNo
  plus_xp_ok: DailyScoreYesNo
  calories_ok: DailyScoreYesNo
  protein_ok: DailyScoreYesNo
}

const DAILY_SCORE_TOTAL_XP_OK_MIN = 50

function floorXp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value)
  return 0
}

function floorNutrition(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value))
  return 0
}

function yesNo(ok: boolean): DailyScoreYesNo {
  return ok ? 'yes' : 'no'
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function taskXpValue(row: TaskXpRow): number {
  return Math.max(0, floorXp(row.xp_reward))
}

function sumXpByCategory(rows: XpEventCategoryRow[]): {
  movement_xp: number
  nutrition_xp: number
  knowledge_xp: number
  day_xp: number
  plus_xp: number
} {
  const totals = {
    movement_xp: 0,
    nutrition_xp: 0,
    knowledge_xp: 0,
    day_xp: 0,
    plus_xp: 0,
  }

  for (const row of rows) {
    const xp = floorXp(row.xp)
    const category = typeof row.category === 'string' ? row.category : ''
    switch (category) {
      case 'bewegung':
        totals.movement_xp += xp
        break
      case 'ernaehrung':
        totals.nutrition_xp += xp
        break
      case 'wissen':
        totals.knowledge_xp += xp
        break
      case 'mein_tag':
        totals.day_xp += xp
        break
      case 'plus':
        totals.plus_xp += xp
        break
      default:
        break
    }
  }

  return totals
}

function sumMealTotals(rows: MealTotalsRow[]): { calories: number; protein: number } {
  let calories = 0
  let protein = 0
  for (const row of rows) {
    calories += floorNutrition(row.kcal)
    protein += floorNutrition(row.protein)
  }
  return { calories, protein }
}

function alcStatusFromAlcoholEvent(row: XpEventCategoryRow | null): AlcStatus | null {
  if (!row) return null
  const metadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null
  const selectedXpRaw = metadata?.selected_xp
  const selectedXp =
    typeof selectedXpRaw === 'number' && Number.isFinite(selectedXpRaw)
      ? Math.floor(selectedXpRaw)
      : floorXp(row.xp)

  if (selectedXp >= 4) return 'low'
  if (selectedXp >= 2) return 'mid'
  if (selectedXp === 0) return 'high'

  const label = typeof metadata?.label === 'string' ? metadata.label : ''
  if (label.includes('Weniger')) return 'low'
  if (label.includes('Zwischen')) return 'mid'
  if (label.includes('Mehr')) return 'high'

  return null
}

async function sumTaskXpForDate(
  userId: string,
  scoreDate: CetDateString,
): Promise<{ plan: number; done: number; error: Error | null }> {
  const { data, error } = await supabase
    .from('tasks')
    .select('xp_reward,completed_at')
    .eq('user_id', userId)
    .eq('task_date', scoreDate)

  if (error) {
    return { plan: 0, done: 0, error: new Error(error.message) }
  }

  let plan = 0
  let done = 0
  for (const row of Array.isArray(data) ? data : []) {
    const xp = taskXpValue(row as TaskXpRow)
    plan += xp
    const completedAt = (row as TaskXpRow).completed_at
    if (completedAt != null && String(completedAt).trim() !== '') {
      done += xp
    }
  }
  return { plan, done, error: null }
}

async function fetchAlcoholEventForDate(
  userId: string,
  scoreDate: CetDateString,
): Promise<{ row: XpEventCategoryRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('xp_events')
    .select('category,xp,metadata')
    .eq('user_id', userId)
    .eq('event_date', scoreDate)
    .eq('category', 'plus')
    .eq('source', 'alcohol')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { row: null, error: new Error(error.message) }
  }
  if (!data || typeof data !== 'object') {
    return { row: null, error: null }
  }
  return { row: data as XpEventCategoryRow, error: null }
}

async function hasLoginEventForDate(
  userId: string,
  scoreDate: CetDateString,
): Promise<{ hasLogin: boolean; error: Error | null }> {
  const { data, error } = await supabase
    .from('xp_events')
    .select('id')
    .eq('user_id', userId)
    .eq('event_date', scoreDate)
    .eq('category', 'plus')
    .eq('source', 'login')
    .limit(1)

  if (error) {
    return { hasLogin: false, error: new Error(error.message) }
  }
  return { hasLogin: Array.isArray(data) && data.length > 0, error: null }
}

/** Gesamt-XP gestern: profiles.total_xp minus heutige Summe aus xp_events. */
export async function yesterdayTotalXpForDailyScore(): Promise<{
  total: number
  error: Error | null
}> {
  const { settings, error: profileError } = await fetchCurrentProfile()
  if (profileError) {
    return { total: 0, error: profileError }
  }

  const { total: todayXp, error: todayError } = await fetchDailyXpTotalForDate(cetToday())
  if (todayError) {
    return { total: 0, error: todayError }
  }

  return { total: Math.max(0, settings.totalXp - todayXp), error: null }
}

export async function fetchDailyScore(scoreDate: CetDateString): Promise<{
  row: DailyScorePayload | null
  error: Error | null
}> {
  const userId = getActiveUserId()
  if (!userId) return { row: null, error: null }

  const { data, error } = await supabase
    .from('daily_scores')
    .select(
      'user_id,score_date,updated_at,total_xp,movement_xp,nutrition_xp,knowledge_xp,day_xp,plus_xp,calories,protein,alc_status,tasks_plan,tasks_done,streak_done,total_xp_ok,movement_xp_ok,nutrition_xp_ok,day_xp_ok,plus_xp_ok,calories_ok,protein_ok',
    )
    .eq('user_id', userId)
    .eq('score_date', scoreDate)
    .maybeSingle()

  if (error) {
    return { row: null, error: new Error(error.message) }
  }
  if (!data || typeof data !== 'object') {
    return { row: null, error: null }
  }

  const row = data as Record<string, unknown>
  const alcRaw = textValue(row.alc_status)
  const alcStatus: AlcStatus | null =
    alcRaw === 'low' || alcRaw === 'mid' || alcRaw === 'high' ? alcRaw : null

  return {
    row: {
      user_id: userId,
      score_date: scoreDate,
      updated_at: typeof row.updated_at === 'string' ? row.updated_at : cetToday(),
      total_xp: floorXp(row.total_xp),
      movement_xp: floorXp(row.movement_xp),
      nutrition_xp: floorXp(row.nutrition_xp),
      knowledge_xp: floorXp(row.knowledge_xp),
      day_xp: floorXp(row.day_xp),
      plus_xp: floorXp(row.plus_xp),
      calories: floorNutrition(row.calories),
      protein: floorNutrition(row.protein),
      alc_status: alcStatus,
      tasks_plan: floorXp(row.tasks_plan),
      tasks_done: floorXp(row.tasks_done),
      streak_done: row.streak_done === 'yes' ? 'yes' : 'no',
      total_xp_ok: row.total_xp_ok === 'yes' ? 'yes' : 'no',
      movement_xp_ok: row.movement_xp_ok === 'yes' ? 'yes' : 'no',
      nutrition_xp_ok: row.nutrition_xp_ok === 'yes' ? 'yes' : 'no',
      day_xp_ok: row.day_xp_ok === 'yes' ? 'yes' : 'no',
      plus_xp_ok: row.plus_xp_ok === 'yes' ? 'yes' : 'no',
      calories_ok: row.calories_ok === 'yes' ? 'yes' : 'no',
      protein_ok: row.protein_ok === 'yes' ? 'yes' : 'no',
    },
    error: null,
  }
}

async function buildDailyScorePayloadForDate(
  scoreDate: CetDateString,
  userId: string,
  totalXp: number,
  profileForNutrition: Awaited<ReturnType<typeof fetchCurrentProfile>>['settings'] | null,
  nutritionRule: NutritionRule | null,
): Promise<{ payload: DailyScorePayload | null; error: Error | null }> {
  const [
    xpResult,
    mealResult,
    taskResult,
    alcoholResult,
    loginResult,
    dayXpResult,
  ] = await Promise.all([
    supabase
      .from('xp_events')
      .select('category,xp,metadata')
      .eq('user_id', userId)
      .eq('event_date', scoreDate),
    supabase
      .from('meal_entries')
      .select('kcal,protein')
      .eq('user_id', userId)
      .eq('event_date', scoreDate),
    sumTaskXpForDate(userId, scoreDate),
    fetchAlcoholEventForDate(userId, scoreDate),
    hasLoginEventForDate(userId, scoreDate),
    fetchDailyXpTotalForDate(scoreDate),
  ])

  if (xpResult.error) {
    return { payload: null, error: new Error(xpResult.error.message) }
  }
  if (mealResult.error) {
    return { payload: null, error: new Error(mealResult.error.message) }
  }
  if (taskResult.error) {
    return { payload: null, error: taskResult.error }
  }
  if (alcoholResult.error) {
    return { payload: null, error: alcoholResult.error }
  }
  if (loginResult.error) {
    return { payload: null, error: loginResult.error }
  }
  if (dayXpResult.error) {
    return { payload: null, error: dayXpResult.error }
  }

  const xpRows = (Array.isArray(xpResult.data) ? xpResult.data : []) as XpEventCategoryRow[]
  const mealRows = (Array.isArray(mealResult.data) ? mealResult.data : []) as MealTotalsRow[]
  const categoryXp = sumXpByCategory(xpRows)
  const mealTotals = sumMealTotals(mealRows)

  const trackAlcohol =
    profileForNutrition != null && isAlcoholTrackingEnabled(profileForNutrition.alcoholMode)
  const alc_status = trackAlcohol ? alcStatusFromAlcoholEvent(alcoholResult.row) : null

  const kcalMax = calculateNutritionKcalMax(nutritionRule, categoryXp.movement_xp)
  const proteinGoal =
    nutritionRule?.protOpt && nutritionRule.protOpt > 0
      ? nutritionRule.protOpt
      : NUTRITION_PROTEIN_GOAL

  const dayTotalXp = dayXpResult.total

  return {
    payload: {
      user_id: userId,
      score_date: scoreDate,
      updated_at: cetToday(),
      total_xp: totalXp,
      movement_xp: categoryXp.movement_xp,
      nutrition_xp: categoryXp.nutrition_xp,
      knowledge_xp: categoryXp.knowledge_xp,
      day_xp: categoryXp.day_xp,
      plus_xp: categoryXp.plus_xp,
      calories: mealTotals.calories,
      protein: mealTotals.protein,
      alc_status,
      tasks_plan: taskResult.plan,
      tasks_done: taskResult.done,
      streak_done: yesNo(loginResult.hasLogin),
      total_xp_ok: yesNo(dayTotalXp > DAILY_SCORE_TOTAL_XP_OK_MIN),
      movement_xp_ok: yesNo(categoryXp.movement_xp >= XP_TARGETS.bewegung),
      nutrition_xp_ok: yesNo(categoryXp.nutrition_xp >= XP_TARGETS.ernaehrung),
      day_xp_ok: yesNo(categoryXp.day_xp >= XP_TARGETS.mein_tag),
      plus_xp_ok: yesNo(categoryXp.plus_xp >= XP_TARGETS.plus),
      calories_ok: yesNo(mealTotals.calories <= kcalMax),
      protein_ok: yesNo(mealTotals.protein >= proteinGoal),
    },
    error: null,
  }
}

/** Aggregiert den Gestern-Stand (xp_events + meal_entries für gestern). */
export async function buildYesterdayDailyScore(): Promise<{
  payload: DailyScorePayload | null
  error: Error | null
}> {
  const userId = getActiveUserId()
  if (!userId) return { payload: null, error: null }

  const [{ total, error: totalError }, { settings, error: profileError }] = await Promise.all([
    yesterdayTotalXpForDailyScore(),
    fetchCurrentProfile(),
  ])
  if (totalError) return { payload: null, error: totalError }
  if (profileError) return { payload: null, error: profileError }

  const { rule: nutritionRule, error: ruleError } = await fetchNutritionRule(settings).then(
    (result) => ({
      rule: result.rule,
      error: result.error,
    }),
  )
  if (ruleError) return { payload: null, error: ruleError }

  return buildDailyScorePayloadForDate(
    cetYesterday(),
    userId,
    total,
    settings,
    nutritionRule,
  )
}

export async function insertDailyScore(payload: DailyScorePayload): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('daily_scores').insert(payload)

  if (error) {
    return { error: new Error(error.message) }
  }
  return { error: null }
}

export async function updateDailyScore(
  scoreDate: CetDateString,
  payload: DailyScorePayload,
): Promise<{ error: Error | null }> {
  const userId = getActiveUserId()
  if (!userId) return { error: null }

  const { error } = await supabase
    .from('daily_scores')
    .update({
      updated_at: payload.updated_at,
      total_xp: payload.total_xp,
      movement_xp: payload.movement_xp,
      nutrition_xp: payload.nutrition_xp,
      knowledge_xp: payload.knowledge_xp,
      day_xp: payload.day_xp,
      plus_xp: payload.plus_xp,
      calories: payload.calories,
      protein: payload.protein,
      alc_status: payload.alc_status,
      tasks_plan: payload.tasks_plan,
      tasks_done: payload.tasks_done,
      streak_done: payload.streak_done,
      total_xp_ok: payload.total_xp_ok,
      movement_xp_ok: payload.movement_xp_ok,
      nutrition_xp_ok: payload.nutrition_xp_ok,
      day_xp_ok: payload.day_xp_ok,
      plus_xp_ok: payload.plus_xp_ok,
      calories_ok: payload.calories_ok,
      protein_ok: payload.protein_ok,
    })
    .eq('user_id', userId)
    .eq('score_date', scoreDate)

  if (error) {
    return { error: new Error(error.message) }
  }
  return { error: null }
}

/**
 * Gestern in daily_scores schreiben.
 * @param force — true: bestehenden Eintrag aktualisieren (z. B. nach „Zurück zu heute“).
 */
export async function syncYesterdayDailyScore(force = false): Promise<{
  error: Error | null
  inserted: boolean
  updated: boolean
}> {
  const userId = getActiveUserId()
  if (!userId) return { error: null, inserted: false, updated: false }

  const scoreDate = cetYesterday()
  const { row: existing, error: existsError } = await fetchDailyScore(scoreDate)
  if (existsError) return { error: existsError, inserted: false, updated: false }

  const { payload, error: buildError } = await buildYesterdayDailyScore()
  if (buildError) return { error: buildError, inserted: false, updated: false }
  if (!payload) return { error: null, inserted: false, updated: false }

  if (existing) {
    if (!force) return { error: null, inserted: false, updated: false }
    const { error: updateError } = await updateDailyScore(scoreDate, payload)
    if (updateError) return { error: updateError, inserted: false, updated: false }
    return { error: null, inserted: false, updated: true }
  }

  const { error: insertError } = await insertDailyScore(payload)
  if (insertError) return { error: insertError, inserted: false, updated: false }

  return { error: null, inserted: true, updated: false }
}

/**
 * Gestern in daily_scores fortschreiben, nur wenn noch kein Eintrag existiert.
 * total_xp: profiles.total_xp − Summe xp_events (heute CET); übrige Felder aus Gestern.
 */
export async function syncYesterdayDailyScoreIfNeeded(): Promise<{
  error: Error | null
  inserted: boolean
}> {
  const { error, inserted } = await syncYesterdayDailyScore(false)
  return { error, inserted }
}

/** @deprecated Alias — nur noch Gestern, siehe {@link syncYesterdayDailyScoreIfNeeded}. */
export async function syncDailyScoresBackfillForStreak(): Promise<{
  error: Error | null
  inserted: number
}> {
  const { error, inserted } = await syncYesterdayDailyScore(false)
  return { error, inserted: inserted ? 1 : 0 }
}

export async function deleteAllDailyScoresForActiveUser(): Promise<{ error: Error | null }> {
  const userId = getActiveUserId()
  if (!userId) return { error: null }

  const { error } = await supabase.from('daily_scores').delete().eq('user_id', userId)
  return { error: error ? new Error(error.message) : null }
}
