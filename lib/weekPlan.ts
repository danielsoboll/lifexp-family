import { cetQuarterHourTime, cetToday } from './cetDate'
import {
  parseTaskColorKey,
  taskColorKeyForDb,
  WEEK_PLAN_ROW_SELECT,
  type TaskColorKey,
} from './taskColors'
import {
  normalizeQuarterHourTime,
  weekPlanDefaultOneHourEndAfter,
  weekPlanFindFreeHourSlot,
  weekPlanQuarterHourOptions,
} from './weekPlanTime'
import { getWeekPlanDisplayDates, getWeekPlanDisplayMonday } from './weekPlanAnchor'
import { getActiveUserId } from './user'
import { supabase } from './supabase'

export type WeekPlanEntry = {
  id: number
  task: string
  planDay: string
  startTime: string
  endTime: string
  done: boolean
  colorKey: TaskColorKey
}

type WeekPlanRow = Record<string, unknown>

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

function boolValue(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function parseTimeValue(value: unknown): string {
  const raw = textValue(value)
  const match = raw.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return '08:00'
  return normalizeQuarterHourTime(`${match[1]}:${match[2]}`)
}

function entryFromRow(row: WeekPlanRow): WeekPlanEntry | null {
  const id = numberValue(row.id)
  if (id <= 0) return null
  const task = textValue(row.task)
  if (!task) return null
  const planDay = textValue(row.plan_day)
  if (!planDay) return null
  return {
    id,
    task,
    planDay,
    startTime: parseTimeValue(row.start_time),
    endTime: parseTimeValue(row.end_time),
    done: boolValue(row.done),
    colorKey: parseTaskColorKey(row.color_key),
  }
}

function activeUserId(): string | null {
  return getActiveUserId()
}

export function currentWeekPlanDates(): string[] {
  return getWeekPlanDisplayDates()
}

export function currentWeekPlanMonday(): string {
  return getWeekPlanDisplayMonday()
}

export async function fetchWeekPlanForCurrentWeek(): Promise<{
  entries: WeekPlanEntry[]
  weekDates: string[]
  error: Error | null
}> {
  const weekDates = getWeekPlanDisplayDates()
  if (weekDates.length === 0) {
    return { entries: [], weekDates: [], error: new Error('Woche konnte nicht geladen werden.') }
  }
  return fetchWeekPlanForRange(weekDates[0], weekDates[weekDates.length - 1])
}

export async function fetchWeekPlanForRange(
  fromDate: string,
  toDate: string,
): Promise<{ entries: WeekPlanEntry[]; weekDates: string[]; error: Error | null }> {
  const userId = activeUserId()
  const weekDates = getWeekPlanDisplayDates()
  if (!userId) {
    return { entries: [], weekDates, error: new Error('Kein Benutzer angemeldet.') }
  }

  const { data, error } = await supabase
    .from('week_plan')
    .select(WEEK_PLAN_ROW_SELECT)
    .eq('user_id', userId)
    .gte('plan_day', fromDate)
    .lte('plan_day', toDate)
    .order('plan_day', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    return { entries: [], weekDates, error: new Error(error.message) }
  }

  const entries = (data ?? [])
    .map((row) => entryFromRow(row as WeekPlanRow))
    .filter((row): row is WeekPlanEntry => row != null)

  return { entries, weekDates, error: null }
}

export async function fetchWeekPlanEntry(id: number): Promise<{
  entry: WeekPlanEntry | null
  error: Error | null
}> {
  const userId = activeUserId()
  if (!userId) {
    return { entry: null, error: new Error('Kein Benutzer angemeldet.') }
  }

  const { data, error } = await supabase
    .from('week_plan')
    .select(WEEK_PLAN_ROW_SELECT)
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return { entry: null, error: new Error(error.message) }
  }
  if (!data) {
    return { entry: null, error: null }
  }
  return { entry: entryFromRow(data as WeekPlanRow), error: null }
}

export type CreateWeekPlanInput = {
  task: string
  planDay: string
  startTime: string
  endTime: string
  colorKey?: TaskColorKey
}

export async function createWeekPlanEntry(
  input: CreateWeekPlanInput,
): Promise<{ entry: WeekPlanEntry | null; error: Error | null }> {
  const userId = activeUserId()
  if (!userId) {
    return { entry: null, error: new Error('Kein Benutzer angemeldet.') }
  }

  const task = input.task.trim()
  if (!task) {
    return { entry: null, error: new Error('Bitte eine Aufgabe eingeben.') }
  }

  const startTime = normalizeQuarterHourTime(input.startTime)
  const endTime = normalizeQuarterHourTime(input.endTime)
  if (timeToMinutesSafe(endTime) <= timeToMinutesSafe(startTime)) {
    return { entry: null, error: new Error('Ende muss nach dem Start liegen.') }
  }

  const { data, error } = await supabase
    .from('week_plan')
    .insert({
      user_id: userId,
      task,
      plan_day: input.planDay,
      start_time: startTime,
      end_time: endTime,
      done: false,
      color_key: taskColorKeyForDb(input.colorKey),
    })
    .select(WEEK_PLAN_ROW_SELECT)
    .single()

  if (error) {
    return { entry: null, error: new Error(error.message) }
  }

  return { entry: entryFromRow(data as WeekPlanRow), error: null }
}

function timeToMinutesSafe(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return 0
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

export type UpdateWeekPlanInput = {
  task?: string
  planDay?: string
  startTime?: string
  endTime?: string
  done?: boolean
  colorKey?: TaskColorKey
}

export async function updateWeekPlanEntry(
  id: number,
  input: UpdateWeekPlanInput,
): Promise<{ error: Error | null }> {
  const userId = activeUserId()
  if (!userId) {
    return { error: new Error('Kein Benutzer angemeldet.') }
  }

  const updates: Record<string, unknown> = {}
  if (input.task !== undefined) {
    const trimmed = input.task.trim()
    if (!trimmed) return { error: new Error('Aufgabe darf nicht leer sein.') }
    updates.task = trimmed
  }
  if (input.planDay !== undefined) updates.plan_day = input.planDay
  if (input.startTime !== undefined) updates.start_time = normalizeQuarterHourTime(input.startTime)
  if (input.endTime !== undefined) updates.end_time = normalizeQuarterHourTime(input.endTime)
  if (input.done !== undefined) updates.done = input.done
  if (input.colorKey !== undefined) updates.color_key = taskColorKeyForDb(input.colorKey)

  if (Object.keys(updates).length === 0) {
    return { error: null }
  }

  const { error } = await supabase.from('week_plan').update(updates).eq('id', id).eq('user_id', userId)

  if (error) {
    return { error: new Error(error.message) }
  }
  return { error: null }
}

export async function deleteWeekPlanEntry(id: number): Promise<{ error: Error | null }> {
  const userId = activeUserId()
  if (!userId) {
    return { error: new Error('Kein Benutzer angemeldet.') }
  }

  const { error } = await supabase.from('week_plan').delete().eq('id', id).eq('user_id', userId)

  if (error) {
    return { error: new Error(error.message) }
  }
  return { error: null }
}

function defaultWeekPlanStartTime(): string {
  const options = weekPlanQuarterHourOptions()
  const nowCet = cetQuarterHourTime()
  if (options.includes(nowCet)) return nowCet
  return options[0] ?? '08:00'
}

export function defaultWeekPlanCreateValues(
  planDay = cetToday(),
  dayEntries: { startTime: string; endTime: string }[] = [],
): {
  planDay: string
  startTime: string
  endTime: string
} {
  if (planDay === cetToday()) {
    const startTime = defaultWeekPlanStartTime()
    return {
      planDay,
      startTime,
      endTime: weekPlanDefaultOneHourEndAfter(startTime),
    }
  }

  const slot = weekPlanFindFreeHourSlot(dayEntries)
  return {
    planDay,
    startTime: slot.startTime,
    endTime: slot.endTime,
  }
}

export async function deleteAllWeekPlanForActiveUser(): Promise<{ error: Error | null }> {
  const userId = activeUserId()
  if (!userId) return { error: null }

  const { error } = await supabase.from('week_plan').delete().eq('user_id', userId)
  return { error: error ? new Error(error.message) : null }
}
