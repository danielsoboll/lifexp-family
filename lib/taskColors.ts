export const TASK_COLOR_KEYS = [1, 2, 3, 4, 5, 6] as const

export type TaskColorKey = (typeof TASK_COLOR_KEYS)[number]

export type TaskColorDefinition = {
  key: TaskColorKey
  defaultLabel: string
  swatchClass: string
  /** Textfarbe für Typ-Auswahl auf hellem Hintergrund */
  pickerLabelClass: string
  markerClass: string
  weekOpenClass: string
  weekOpenTextClass: string
  weekOpenCheckboxBorderClass: string
  plannerOpenClass: string
}

export const TASK_COLOR_DEFINITIONS: Record<TaskColorKey, TaskColorDefinition> = {
  1: {
    key: 1,
    defaultLabel: 'für mich',
    swatchClass:
      'border-sky-500 bg-gradient-to-br from-sky-300 to-sky-500 dark:border-sky-500 dark:from-sky-700 dark:to-sky-900',
    pickerLabelClass: 'text-sky-600 dark:text-sky-400',
    markerClass: 'bg-sky-500 dark:bg-sky-400',
    weekOpenClass:
      'border-sky-500/80 bg-gradient-to-b from-sky-300/95 to-sky-500/95 dark:border-sky-600 dark:from-sky-700 dark:to-sky-900',
    weekOpenTextClass: 'text-sky-950 dark:text-sky-50',
    weekOpenCheckboxBorderClass: 'border-sky-700/40 bg-white/25 dark:border-sky-500/50 dark:bg-sky-950/20',
    plannerOpenClass:
      'border-sky-400/90 bg-gradient-to-b from-sky-50/95 via-sky-100/85 to-sky-200/70 ring-sky-300/25 dark:border-sky-700 dark:from-sky-950/45 dark:via-sky-900/35 dark:to-sky-950 dark:ring-sky-800/35',
  },
  2: {
    key: 2,
    defaultLabel: 'privater Termin',
    swatchClass:
      'border-violet-500 bg-gradient-to-br from-violet-300 to-violet-500 dark:border-violet-500 dark:from-violet-700 dark:to-violet-900',
    pickerLabelClass: 'text-violet-600 dark:text-violet-400',
    markerClass: 'bg-violet-500 dark:bg-violet-400',
    weekOpenClass:
      'border-violet-500/80 bg-gradient-to-b from-violet-300/95 to-violet-500/95 dark:border-violet-600 dark:from-violet-700 dark:to-violet-900',
    weekOpenTextClass: 'text-violet-950 dark:text-violet-50',
    weekOpenCheckboxBorderClass:
      'border-violet-700/40 bg-white/25 dark:border-violet-500/50 dark:bg-violet-950/20',
    plannerOpenClass:
      'border-violet-400/90 bg-gradient-to-b from-violet-50/95 via-violet-100/85 to-violet-200/70 ring-violet-300/25 dark:border-violet-700 dark:from-violet-950/45 dark:via-violet-900/35 dark:to-violet-950 dark:ring-violet-800/35',
  },
  3: {
    key: 3,
    defaultLabel: 'beruflich',
    swatchClass:
      'border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-200 dark:border-yellow-400 dark:from-yellow-400 dark:to-yellow-600',
    pickerLabelClass: 'text-yellow-500 dark:text-yellow-200',
    markerClass: 'bg-yellow-200 dark:bg-yellow-400',
    weekOpenClass:
      'border-yellow-200/80 bg-gradient-to-b from-yellow-50/98 to-yellow-200/95 dark:border-yellow-400/75 dark:from-yellow-400 dark:to-yellow-600',
    weekOpenTextClass: 'text-yellow-950 dark:text-yellow-50',
    weekOpenCheckboxBorderClass:
      'border-yellow-400/25 bg-white/35 dark:border-yellow-400/40 dark:bg-yellow-950/10',
    plannerOpenClass:
      'border-yellow-300/90 bg-gradient-to-b from-yellow-50/98 via-yellow-50/96 to-yellow-100/70 ring-yellow-200/25 dark:border-yellow-500/80 dark:from-yellow-700/35 dark:via-yellow-600/22 dark:to-yellow-800/40 dark:ring-yellow-500/30',
  },
  4: {
    key: 4,
    defaultLabel: 'organisatorisch',
    swatchClass:
      'border-amber-500 bg-gradient-to-br from-amber-300 to-amber-500 dark:border-amber-500 dark:from-amber-700 dark:to-amber-900',
    pickerLabelClass: 'text-amber-600 dark:text-amber-400',
    markerClass: 'bg-amber-500 dark:bg-amber-400',
    weekOpenClass:
      'border-amber-500/80 bg-gradient-to-b from-amber-300/95 to-amber-500/95 dark:border-amber-600 dark:from-amber-700 dark:to-amber-900',
    weekOpenTextClass: 'text-amber-950 dark:text-amber-50',
    weekOpenCheckboxBorderClass:
      'border-amber-700/40 bg-white/25 dark:border-amber-500/50 dark:bg-amber-950/20',
    plannerOpenClass:
      'border-amber-400/90 bg-gradient-to-b from-amber-50/95 via-amber-100/85 to-amber-200/70 ring-amber-300/25 dark:border-amber-700 dark:from-amber-950/45 dark:via-amber-900/35 dark:to-amber-950 dark:ring-amber-800/35',
  },
  5: {
    key: 5,
    defaultLabel: 'beruflicher Termin',
    swatchClass:
      'border-rose-500 bg-gradient-to-br from-rose-300 to-rose-500 dark:border-rose-500 dark:from-rose-700 dark:to-rose-900',
    pickerLabelClass: 'text-rose-600 dark:text-rose-400',
    markerClass: 'bg-rose-500 dark:bg-rose-400',
    weekOpenClass:
      'border-rose-500/80 bg-gradient-to-b from-rose-300/95 to-rose-500/95 dark:border-rose-600 dark:from-rose-700 dark:to-rose-900',
    weekOpenTextClass: 'text-rose-950 dark:text-rose-50',
    weekOpenCheckboxBorderClass: 'border-rose-700/40 bg-white/25 dark:border-rose-500/50 dark:bg-rose-950/20',
    plannerOpenClass:
      'border-rose-400/90 bg-gradient-to-b from-rose-50/95 via-rose-100/85 to-rose-200/70 ring-rose-300/25 dark:border-rose-700 dark:from-rose-950/45 dark:via-rose-900/35 dark:to-rose-950 dark:ring-rose-800/35',
  },
  6: {
    key: 6,
    defaultLabel: 'Erinnerung',
    swatchClass:
      'border-stone-400 bg-gradient-to-br from-stone-200 to-stone-400 dark:border-stone-500 dark:from-stone-600 dark:to-stone-800',
    pickerLabelClass: 'text-stone-600 dark:text-stone-400',
    markerClass: 'bg-stone-400 dark:bg-stone-500',
    weekOpenClass:
      'border-stone-400/80 bg-gradient-to-b from-stone-200/95 to-stone-400/95 dark:border-stone-600 dark:from-stone-700 dark:to-stone-900',
    weekOpenTextClass: 'text-stone-900 dark:text-stone-50',
    weekOpenCheckboxBorderClass:
      'border-stone-600/40 bg-white/25 dark:border-stone-500/50 dark:bg-stone-950/20',
    plannerOpenClass:
      'border-stone-400/90 bg-gradient-to-b from-stone-50/95 via-stone-100/85 to-stone-200/70 ring-stone-300/25 dark:border-stone-600 dark:from-stone-900/45 dark:via-stone-950/35 dark:to-stone-950 dark:ring-stone-700/35',
  },
}

export type TaskColorLabels = Record<TaskColorKey, string>

export function defaultTaskColorLabels(): TaskColorLabels {
  return {
    1: TASK_COLOR_DEFINITIONS[1].defaultLabel,
    2: TASK_COLOR_DEFINITIONS[2].defaultLabel,
    3: TASK_COLOR_DEFINITIONS[3].defaultLabel,
    4: TASK_COLOR_DEFINITIONS[4].defaultLabel,
    5: TASK_COLOR_DEFINITIONS[5].defaultLabel,
    6: TASK_COLOR_DEFINITIONS[6].defaultLabel,
  }
}

export function parseTaskColorKey(value: unknown): TaskColorKey {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const key = Math.floor(value)
    if (key >= 1 && key <= 6) return key as TaskColorKey
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    if (parsed >= 1 && parsed <= 6) return parsed as TaskColorKey
  }
  return 1
}

/** Für Inserts/Updates in tasks und week_plan (1–6). */
export function taskColorKeyForDb(value: unknown): TaskColorKey {
  return parseTaskColorKey(value)
}

/** Explizite Spaltenliste — color_key muss in Supabase existieren. */
export const TASKS_ROW_SELECT =
  'id,user_id,title,xp_reward,task_date,enter_date,plan_day,completed_at,color_key'

export const WEEK_PLAN_ROW_SELECT =
  'id,user_id,task,plan_day,start_time,end_time,done,color_key'

export function taskColorDefinition(colorKey: TaskColorKey): TaskColorDefinition {
  return TASK_COLOR_DEFINITIONS[colorKey]
}

export function weekPlanDoneBlockClass(): string {
  return 'border-emerald-500/90 bg-gradient-to-b from-emerald-400/95 to-teal-500/95 text-white dark:border-emerald-500 dark:from-emerald-600 dark:to-teal-700'
}

export function weekPlanDoneCheckboxBorderClass(): string {
  return 'border-emerald-700/80 bg-emerald-800/25'
}

export function plannerTaskDoneCardClass(): string {
  return 'w-full rounded-2xl border-2 border-emerald-400/90 bg-gradient-to-b from-emerald-50 via-emerald-100/90 to-teal-200/75 px-4 py-3 text-left ring-1 ring-emerald-200/80 dark:border-emerald-600 dark:from-emerald-900/70 dark:via-emerald-950/55 dark:to-teal-950 dark:ring-emerald-800/60'
}
