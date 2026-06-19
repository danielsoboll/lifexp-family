import {
  defaultTaskColorLabels,
  TASK_COLOR_KEYS,
  type TaskColorKey,
  type TaskColorLabels,
} from './taskColors'
import { getActiveUserId } from './user'
import { supabase } from './supabase'

export const TASK_COLOR_LABELS_CHANGED_EVENT = 'lifexp-task-color-labels-changed'

const TASK_COLOR_COL_FIELDS = {
  1: 'col1_txt',
  2: 'col2_txt',
  3: 'col3_txt',
  4: 'col4_txt',
  5: 'col5_txt',
  6: 'col6_txt',
} as const satisfies Record<TaskColorKey, string>

const TASK_COLOR_SELECT_FIELDS = Object.values(TASK_COLOR_COL_FIELDS).join(',')

export function notifyTaskColorLabelsChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(TASK_COLOR_LABELS_CHANGED_EVENT))
}

type TaskColorIndivRow = Record<string, unknown>

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function activeUserId(): string | null {
  return getActiveUserId()
}

function colFieldForKey(colorKey: TaskColorKey): string {
  return TASK_COLOR_COL_FIELDS[colorKey]
}

function labelsFromRow(row: TaskColorIndivRow | null): {
  labels: TaskColorLabels
  hasCustomLabels: boolean
} {
  const defaults = defaultTaskColorLabels()
  const labels = { ...defaults }
  if (!row) {
    return { labels, hasCustomLabels: false }
  }

  let hasCustomLabels = false
  for (const colorKey of TASK_COLOR_KEYS) {
    const custom = textValue(row[colFieldForKey(colorKey)])
    if (custom) {
      labels[colorKey] = custom
      hasCustomLabels = true
    }
  }

  return { labels, hasCustomLabels }
}

export async function fetchTaskColorIndivRow(): Promise<{
  row: TaskColorIndivRow | null
  error: Error | null
}> {
  const userId = activeUserId()
  if (!userId) return { row: null, error: null }

  const { data, error } = await supabase
    .from('task_colors_indiv')
    .select(TASK_COLOR_SELECT_FIELDS)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    return { row: null, error: new Error(error.message) }
  }

  return { row: (data as TaskColorIndivRow | null) ?? null, error: null }
}

export async function fetchResolvedTaskColorLabels(): Promise<{
  labels: TaskColorLabels
  hasCustomLabels: boolean
  error: Error | null
}> {
  const { row, error } = await fetchTaskColorIndivRow()
  if (error) {
    return { labels: defaultTaskColorLabels(), hasCustomLabels: false, error }
  }

  const { labels, hasCustomLabels } = labelsFromRow(row)
  return { labels, hasCustomLabels, error: null }
}

export async function saveTaskColorLabels(input: TaskColorLabels): Promise<{ error: Error | null }> {
  const userId = activeUserId()
  if (!userId) {
    return { error: new Error('Kein Benutzer. Bitte Onboarding abschließen.') }
  }

  const defaults = defaultTaskColorLabels()
  const payload: Record<string, string | null> = { user_id: userId }

  for (const colorKey of TASK_COLOR_KEYS) {
    const nextLabel = input[colorKey].trim()
    const defaultLabel = defaults[colorKey]
    payload[colFieldForKey(colorKey)] =
      !nextLabel || nextLabel === defaultLabel ? null : nextLabel
  }

  const hasAnyCustom = TASK_COLOR_KEYS.some((colorKey) => payload[colFieldForKey(colorKey)] != null)

  const { data: existing, error: selectError } = await supabase
    .from('task_colors_indiv')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (selectError) {
    return { error: new Error(selectError.message) }
  }

  if (!hasAnyCustom) {
    if (existing?.id != null) {
      const { error } = await supabase.from('task_colors_indiv').delete().eq('user_id', userId)
      if (error) return { error: new Error(error.message) }
    }
    notifyTaskColorLabelsChanged()
    return { error: null }
  }

  if (existing?.id != null) {
    const { error } = await supabase
      .from('task_colors_indiv')
      .update(payload)
      .eq('user_id', userId)

    if (error) return { error: new Error(error.message) }
  } else {
    const { error } = await supabase.from('task_colors_indiv').insert(payload)
    if (error) return { error: new Error(error.message) }
  }

  notifyTaskColorLabelsChanged()
  return { error: null }
}

export async function deleteAllTaskColorsIndivForActiveUser(): Promise<{ error: Error | null }> {
  const userId = activeUserId()
  if (!userId) return { error: null }

  const { error } = await supabase.from('task_colors_indiv').delete().eq('user_id', userId)
  return { error: error ? new Error(error.message) : null }
}
