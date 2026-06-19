import { cetDayAfterTomorrow, cetFormatLongDateDe, cetToday, cetTomorrow, cetYesterday } from './cetDate'
import {
  grantLeagueXpOnce,
  hasCompletedPlannerTaskBefore,
  LEAGUE_XP_SOURCE,
} from './leagueXp'
import {
  individualGoalFlagsFromProfile,
  PLUS_XP_TASK_BUDGET_BASE,
  taskPlannerPlusXpBudget,
} from './plusXpBudget'
import { fetchCurrentProfile } from './profile'
import { parseTaskColorKey, TASKS_ROW_SELECT, taskColorKeyForDb, type TaskColorKey } from './taskColors'
import { deleteXpEventsForSource, recordXpEvent } from './xpEvents'
import { getActiveUserId } from './user'
import { supabase } from './supabase'

export { TASK_PLANNER_PLUS_XP_BUDGET } from './plusXpBudget'

export async function fetchTaskPlannerPlusXpBudgetForProfile(): Promise<{
  budget: number
  error: Error | null
}> {
  const { settings, error } = await fetchCurrentProfile()
  if (error) {
    return { budget: PLUS_XP_TASK_BUDGET_BASE, error }
  }
  return {
    budget: taskPlannerPlusXpBudget(individualGoalFlagsFromProfile(settings)),
    error: null,
  }
}

export type PlannerDayFilter = 'gestern' | 'heute' | 'morgen'

export type PlannerTask = {
  id: number
  title: string
  xpReward: number
  /** Nur Info: `plan_day` aus profiles.streak_days beim Speichern (keine Filter-Logik). */
  planDay: number
  /** Geplanter Tag der Aufgabe (Filter Heute/Gestern/Morgen). */
  taskDate: string
  /** Anlagedatum in CET – wird beim Erstellen gesetzt und nie geändert. */
  enterDate: string
  completedAt: string | null
  colorKey: TaskColorKey
}

type TaskRow = Record<string, unknown>

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function numberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value)
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function sortPlannerTasksByXpDesc(tasks: PlannerTask[]): PlannerTask[] {
  return [...tasks].sort((a, b) => b.xpReward - a.xpReward || a.id - b.id)
}

function taskFromRow(row: TaskRow): PlannerTask | null {
  const id = numberValue(row.id)
  if (id <= 0) return null
  const title = textValue(row.title) || textValue(row.description) || textValue(row.text)
  if (!title) return null
  const taskDate = textValue(row.task_date) || cetToday()
  const enterDate = textValue(row.enter_date) || taskDate
  return {
    id,
    title,
    xpReward: Math.max(0, numberValue(row.xp_reward ?? row.plus_xp ?? row.xp)),
    planDay: Math.max(0, numberValue(row.plan_day)),
    taskDate,
    enterDate,
    completedAt: textValue(row.completed_at) || null,
    colorKey: parseTaskColorKey(row.color_key),
  }
}

async function planDayForInfo(): Promise<{ planDay: number; error: Error | null }> {
  const { settings, error } = await fetchCurrentProfile()
  if (error) {
    return { planDay: 0, error }
  }
  return { planDay: Math.max(0, settings.challengeDay), error: null }
}

function activeUserId(): string | null {
  return getActiveUserId()
}

/** Kalenderdatum „Gestern“ in CET. */
export function plannerYesterdayDate(): string {
  return cetYesterday()
}

/** Kalenderdatum „Heute“ in CET. */
export function plannerTodayDate(): string {
  return cetToday()
}

/** Kalenderdatum „Morgen“ in CET. */
export function plannerTomorrowDate(): string {
  return cetTomorrow()
}

/** Frühestes Datum für „zum Datum“ planen (übermorgen CET). */
export function plannerDayAfterTomorrowDate(): string {
  return cetDayAfterTomorrow()
}

export function parsePlannerDateInput(value: string): string | null {
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null
  return trimmed
}

export function validateCustomPlannerTaskDate(taskDate: string): { valid: boolean; error: Error | null } {
  const normalized = parsePlannerDateInput(taskDate)
  if (!normalized) {
    return { valid: false, error: new Error('Bitte ein gültiges Datum wählen.') }
  }
  if (normalized < plannerDayAfterTomorrowDate()) {
    return { valid: false, error: new Error('Bitte ein Datum ab übermorgen wählen.') }
  }
  return { valid: true, error: null }
}

export function formatPlannerDateDe(taskDate: string): string {
  return cetFormatLongDateDe(taskDate)
}

/** @deprecated Alias – bitte `plannerYesterdayDate` verwenden. */
export function yesterdayEventDate(): string {
  return plannerYesterdayDate()
}

/** @deprecated Alias – bitte `plannerTomorrowDate` verwenden. */
export function tomorrowEventDate(): string {
  return plannerTomorrowDate()
}

export function sumTaskPlusXp(tasks: PlannerTask[]): number {
  return tasks.reduce((sum, task) => sum + task.xpReward, 0)
}

export function remainingTaskPlusXp(
  tasks: PlannerTask[],
  budget: number = PLUS_XP_TASK_BUDGET_BASE,
): number {
  return Math.max(0, budget - sumTaskPlusXp(tasks))
}

/** Plus-XP für einen Planungstag: vergeben, gutgeschrieben, noch zu verteilen. */
export function taskPlannerPlusXpStats(
  allTasks: PlannerTask[],
  budget: number = PLUS_XP_TASK_BUDGET_BASE,
): {
  allocatedXp: number
  earnedXp: number
  remainingXp: number
  budget: number
} {
  const allocatedXp = sumTaskPlusXp(allTasks)
  const earnedXp = sumTaskPlusXp(allTasks.filter((task) => task.completedAt))
  const remainingXp = remainingTaskPlusXp(allTasks, budget)
  return { allocatedXp, earnedXp, remainingXp, budget }
}

/** Max. Plus-XP für eine Aufgabe beim Bearbeiten (andere Aufgaben bleiben unverändert). */
export function remainingTaskPlusXpExcluding(
  tasks: PlannerTask[],
  excludeTaskId: number,
  budget: number = PLUS_XP_TASK_BUDGET_BASE,
): number {
  return remainingTaskPlusXp(
    tasks.filter((task) => task.id !== excludeTaskId),
    budget,
  )
}

function taskXpSource(taskId: number): string {
  return `task:${taskId}`
}

async function fetchPlannerTasksByDate(
  taskDate: string,
  openOnly = false,
): Promise<{ tasks: PlannerTask[]; error: Error | null }> {
  const userId = activeUserId()
  if (!userId) {
    return { tasks: [], error: new Error('Kein Benutzer angemeldet.') }
  }

  let query = supabase
    .from('tasks')
    .select(TASKS_ROW_SELECT)
    .eq('user_id', userId)
    .eq('task_date', taskDate)

  if (openOnly) {
    query = query.is('completed_at', null)
  }

  const { data, error } = await query.order('id', { ascending: true })

  if (error) {
    return { tasks: [], error: new Error(error.message) }
  }

  const tasks = (Array.isArray(data) ? data : [])
    .map((row) => taskFromRow(row as TaskRow))
    .filter((task): task is PlannerTask => task !== null)

  return { tasks, error: null }
}

/** Aufgaben für ein Kalenderdatum `task_date` (CET). */
export async function fetchPlannerTasks(
  taskDate: string = plannerTodayDate(),
): Promise<{ tasks: PlannerTask[]; error: Error | null }> {
  return fetchPlannerTasksByDate(taskDate)
}

export function plannerDateForDayLabel(filter: PlannerDayFilter): string {
  if (filter === 'gestern') return plannerYesterdayDate()
  if (filter === 'heute') return plannerTodayDate()
  return plannerTomorrowDate()
}

/** Aufgaben strikt nach `task_date` in CET: gestern / heute / morgen. */
export async function fetchPlannerTasksForDay(
  filter: PlannerDayFilter,
): Promise<{ tasks: PlannerTask[]; error: Error | null }> {
  const taskDate = plannerDateForDayLabel(filter)
  const { tasks, error } = await fetchPlannerTasksByDate(taskDate)
  if (error) {
    return { tasks: [], error }
  }

  return {
    tasks: sortPlannerTasksByXpDesc(tasks.filter((task) => task.taskDate === taskDate)),
    error: null,
  }
}

/** Offene Aufgaben für heute (Plus-Bereich): `task_date` = heute CET, nicht erledigt. */
export async function fetchOpenPlannerTasksForToday(): Promise<{
  tasks: PlannerTask[]
  error: Error | null
}> {
  const userId = activeUserId()
  if (!userId) {
    return { tasks: [], error: new Error('Kein Benutzer angemeldet.') }
  }

  const taskDate = plannerTodayDate()

  const { data, error } = await supabase
    .from('tasks')
    .select(TASKS_ROW_SELECT)
    .eq('user_id', userId)
    .eq('task_date', taskDate)
    .is('completed_at', null)
    .order('id', { ascending: true })

  if (error) {
    return { tasks: [], error: new Error(error.message) }
  }

  const tasks = (Array.isArray(data) ? data : [])
    .map((row) => taskFromRow(row as TaskRow))
    .filter((task): task is PlannerTask => task !== null && task.taskDate === taskDate)

  return { tasks: sortPlannerTasksByXpDesc(tasks), error: null }
}

export async function completePlannerTask(taskId: number): Promise<{ error: Error | null }> {
  const userId = activeUserId()
  if (!userId) {
    return { error: new Error('Kein Benutzer angemeldet.') }
  }

  const { data: row, error: fetchError } = await supabase
    .from('tasks')
    .select(TASKS_ROW_SELECT)
    .eq('id', taskId)
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError) {
    return { error: new Error(fetchError.message) }
  }

  const task = taskFromRow((row ?? {}) as TaskRow)
  if (!task || task.completedAt) {
    return { error: new Error('Aufgabe nicht gefunden oder bereits erledigt.') }
  }

  if (task.taskDate !== plannerTodayDate()) {
    return { error: new Error('Nur heutige Aufgaben können hier abgehakt werden.') }
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('user_id', userId)
    .is('completed_at', null)
    .select('id')
    .maybeSingle()

  if (error) {
    return { error: new Error(error.message) }
  }

  if (!data) {
    return { error: new Error('Aufgabe konnte nicht als erledigt markiert werden.') }
  }

  const { error: xpError } = await recordXpEvent({
    category: 'plus',
    source: taskXpSource(taskId),
    xp: task.xpReward,
    celebrate: true,
    metadata: {
      label: task.title,
      task_id: taskId,
      task_date: task.taskDate,
      enter_date: task.enterDate,
      plan_day: task.planDay,
    },
  })

  if (xpError) {
    await supabase
      .from('tasks')
      .update({ completed_at: null })
      .eq('id', taskId)
      .eq('user_id', userId)
    return { error: xpError }
  }

  const hadCompletedBefore = await hasCompletedPlannerTaskBefore(userId, taskId)
  if (!hadCompletedBefore) {
    await grantLeagueXpOnce({
      source: LEAGUE_XP_SOURCE.plusTask,
      scope: 'lifetime',
    })
  }

  return { error: null }
}

export async function createPlannerTask({
  title,
  xpReward,
  taskDate = plannerTodayDate(),
  skipPlusXpBudget = false,
  colorKey = 1,
}: {
  title: string
  xpReward: number
  taskDate?: string
  skipPlusXpBudget?: boolean
  colorKey?: TaskColorKey
}): Promise<{ task: PlannerTask | null; error: Error | null }> {
  const userId = activeUserId()
  if (!userId) {
    return { task: null, error: new Error('Kein Benutzer angemeldet.') }
  }

  const trimmed = title.trim()
  if (!trimmed) {
    return { task: null, error: new Error('Bitte eine Aufgabe beschreiben.') }
  }

  const xpAmount = Math.max(0, Math.floor(xpReward))
  if (xpAmount <= 0) {
    return { task: null, error: new Error('Bitte Plus-XP größer als 0 vergeben.') }
  }

  if (!skipPlusXpBudget) {
    const customCheck = validateCustomPlannerTaskDate(taskDate)
    if (customCheck.valid) {
      skipPlusXpBudget = true
    }
  }

  if (!skipPlusXpBudget) {
    const { budget, error: budgetError } = await fetchTaskPlannerPlusXpBudgetForProfile()
    if (budgetError) {
      return { task: null, error: budgetError }
    }
    const { tasks: tasksOnDay, error: dayTasksError } = await fetchPlannerTasksByDate(taskDate)
    if (dayTasksError) {
      return { task: null, error: dayTasksError }
    }
    const { remainingXp } = taskPlannerPlusXpStats(tasksOnDay, budget)
    if (xpAmount > remainingXp) {
      return {
        task: null,
        error: new Error(
          `Maximal noch ${remainingXp} von ${budget} Plus-XP für diesen Tag verfügbar.`,
        ),
      }
    }
  } else {
    const customCheck = validateCustomPlannerTaskDate(taskDate)
    if (!customCheck.valid && customCheck.error) {
      return { task: null, error: customCheck.error }
    }
  }

  const { planDay, error: profileError } = await planDayForInfo()
  if (profileError) {
    return { task: null, error: profileError }
  }

  const enterDate = plannerTodayDate()

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: trimmed,
      xp_reward: xpAmount,
      task_date: taskDate,
      enter_date: enterDate,
      plan_day: planDay,
      completed_at: null,
      color_key: taskColorKeyForDb(colorKey),
    })
    .select(TASKS_ROW_SELECT)
    .single()

  if (error) {
    return { task: null, error: new Error(error.message) }
  }

  const task = taskFromRow((data ?? {}) as TaskRow)
  if (!task) {
    return { task: null, error: new Error('Aufgabe konnte nicht gelesen werden.') }
  }

  return { task, error: null }
}

export async function updatePlannerTask({
  taskId,
  title,
  xpReward,
  colorKey,
  allTasksOnDay,
  skipPlusXpBudget = false,
}: {
  taskId: number
  title?: string
  xpReward?: number
  colorKey?: TaskColorKey
  allTasksOnDay: PlannerTask[]
  skipPlusXpBudget?: boolean
}): Promise<{ error: Error | null }> {
  const userId = activeUserId()
  if (!userId) {
    return { error: new Error('Kein Benutzer angemeldet.') }
  }

  const existing = allTasksOnDay.find((task) => task.id === taskId)
  if (!existing) {
    return { error: new Error('Aufgabe nicht gefunden.') }
  }

  const updates: { title?: string; xp_reward?: number; color_key?: TaskColorKey } = {}
  let nextTitle = existing.title
  let nextXp = existing.xpReward

  if (title !== undefined) {
    const trimmed = title.trim()
    if (!trimmed) {
      return { error: new Error('Bitte eine Aufgabe beschreiben.') }
    }
    updates.title = trimmed
    nextTitle = trimmed
  }

  if (xpReward !== undefined) {
    const xpAmount = Math.max(0, Math.floor(xpReward))
    if (xpAmount <= 0) {
      return { error: new Error('Bitte Plus-XP größer als 0 vergeben.') }
    }
    if (!skipPlusXpBudget && !validateCustomPlannerTaskDate(existing.taskDate).valid) {
      const { budget, error: budgetError } = await fetchTaskPlannerPlusXpBudgetForProfile()
      if (budgetError) {
        return { error: budgetError }
      }
      const maxXp = remainingTaskPlusXpExcluding(allTasksOnDay, taskId, budget)
      if (xpAmount > maxXp) {
        return {
          error: new Error(`Maximal ${maxXp} Plus-XP für diese Aufgabe (Budget ${budget}).`),
        }
      }
    }
    updates.xp_reward = xpAmount
    nextXp = xpAmount
  }

  if (colorKey !== undefined) {
    updates.color_key = taskColorKeyForDb(colorKey)
  }

  if (updates.title === undefined && updates.xp_reward === undefined && updates.color_key === undefined) {
    return { error: null }
  }

  const { error } = await supabase.from('tasks').update(updates).eq('id', taskId).eq('user_id', userId)

  if (error) {
    return { error: new Error(error.message) }
  }

  if (
    updates.xp_reward !== undefined &&
    updates.xp_reward !== existing.xpReward &&
    existing.completedAt
  ) {
    const { error: deleteXpError } = await deleteXpEventsForSource(taskXpSource(taskId))
    if (deleteXpError) {
      return { error: deleteXpError }
    }

    const { error: xpError } = await recordXpEvent({
      category: 'plus',
      source: taskXpSource(taskId),
      xp: nextXp,
      celebrate: false,
      metadata: {
        label: nextTitle,
        task_id: taskId,
        task_date: existing.taskDate,
        enter_date: existing.enterDate,
        plan_day: existing.planDay,
      },
    })
    if (xpError) {
      return { error: xpError }
    }
  }

  return { error: null }
}

/** Aufgabe von gestern nach heute: nur `task_date` ändern, `enter_date` bleibt. */
export async function transferPlannerTaskToToday(taskId: number): Promise<{ error: Error | null }> {
  const userId = activeUserId()
  if (!userId) {
    return { error: new Error('Kein Benutzer angemeldet.') }
  }

  const today = plannerTodayDate()
  const yesterday = plannerYesterdayDate()

  const { data, error: fetchError } = await supabase
    .from('tasks')
    .select(TASKS_ROW_SELECT)
    .eq('id', taskId)
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError) {
    return { error: new Error(fetchError.message) }
  }

  const existing = taskFromRow((data ?? {}) as TaskRow)
  if (!existing || existing.taskDate !== yesterday) {
    return { error: new Error('Aufgabe von gestern nicht gefunden.') }
  }
  if (existing.completedAt) {
    return { error: new Error('Erledigte Aufgaben können nicht für heute übernommen werden.') }
  }

  const { tasks: todayTasks, error: todayError } = await fetchPlannerTasks(today)
  if (todayError) {
    return { error: todayError }
  }

  const { budget, error: budgetError } = await fetchTaskPlannerPlusXpBudgetForProfile()
  if (budgetError) {
    return { error: budgetError }
  }
  const remainingToday = remainingTaskPlusXp(todayTasks, budget)
  if (existing.xpReward > remainingToday) {
    return {
      error: new Error(`Heute sind nur noch ${remainingToday} von ${budget} Plus-XP frei.`),
    }
  }

  const { planDay, error: profileError } = await planDayForInfo()
  if (profileError) {
    return { error: profileError }
  }

  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      task_date: today,
      plan_day: planDay,
    })
    .eq('id', taskId)
    .eq('user_id', userId)
    .eq('task_date', yesterday)
    .is('completed_at', null)

  if (updateError) {
    return { error: new Error(updateError.message) }
  }

  return { error: null }
}

/** Aufgabe von heute nach morgen: nur `task_date` ändern, `enter_date` bleibt. */
export async function schedulePlannerTaskForTomorrow(taskId: number): Promise<{ error: Error | null }> {
  const userId = activeUserId()
  if (!userId) {
    return { error: new Error('Kein Benutzer angemeldet.') }
  }

  const today = plannerTodayDate()
  const tomorrow = plannerTomorrowDate()

  const { data, error: fetchError } = await supabase
    .from('tasks')
    .select(TASKS_ROW_SELECT)
    .eq('id', taskId)
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError) {
    return { error: new Error(fetchError.message) }
  }

  const existing = taskFromRow((data ?? {}) as TaskRow)
  if (!existing || existing.taskDate !== today) {
    return { error: new Error('Aufgabe für heute nicht gefunden.') }
  }

  if (existing.completedAt) {
    return { error: new Error('Erledigte Aufgaben können nicht für morgen eingeplant werden.') }
  }

  const { tasks: tomorrowTasks, error: tomorrowError } = await fetchPlannerTasks(tomorrow)
  if (tomorrowError) {
    return { error: tomorrowError }
  }

  const { budget, error: budgetError } = await fetchTaskPlannerPlusXpBudgetForProfile()
  if (budgetError) {
    return { error: budgetError }
  }
  const remainingTomorrow = remainingTaskPlusXp(tomorrowTasks, budget)
  if (existing.xpReward > remainingTomorrow) {
    return {
      error: new Error(`Morgen sind nur noch ${remainingTomorrow} von ${budget} Plus-XP frei.`),
    }
  }

  const { planDay, error: profileError } = await planDayForInfo()
  if (profileError) {
    return { error: profileError }
  }

  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      task_date: tomorrow,
      plan_day: planDay,
    })
    .eq('id', taskId)
    .eq('user_id', userId)
    .eq('task_date', today)
    .is('completed_at', null)

  if (updateError) {
    return { error: new Error(updateError.message) }
  }

  return { error: null }
}

export async function deleteAllTasksForActiveUser(): Promise<{ error: Error | null }> {
  const userId = activeUserId()
  if (!userId) {
    return { error: null }
  }

  const { error } = await supabase.from('tasks').delete().eq('user_id', userId)
  return { error: error ? new Error(error.message) : null }
}

export async function deletePlannerTask(taskId: number): Promise<{ error: Error | null }> {
  const userId = activeUserId()
  if (!userId) {
    return { error: new Error('Kein Benutzer angemeldet.') }
  }

  const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', userId)

  if (error) {
    return { error: new Error(error.message) }
  }

  const { error: xpError } = await deleteXpEventsForSource(taskXpSource(taskId))
  return { error: xpError }
}
