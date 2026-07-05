import { cetDaysBetween, cetWeekdayIndex, normalizeDateKey } from '../cetDate'
import type { RecurringQuestSchedule } from './types'

export const RECURRING_WEEKDAY_LABELS_DE = [
  'Sonntag',
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
] as const

export const RECURRING_SCHEDULE_OPTIONS: ReadonlyArray<{
  id: RecurringQuestSchedule
  label: string
  hint?: string
}> = [
  { id: 'daily', label: 'Jeden Tag' },
  { id: 'weekdays', label: 'Arbeitstag (Mo–Fr)' },
  { id: 'every_other_day', label: 'Alle 2 Tage', hint: 'Rhythmus ab dem Starttag' },
  { id: 'weekly', label: '1× pro Woche' },
]

export function recurringScheduleLabel(
  schedule: RecurringQuestSchedule,
  weeklyWeekday: number | null | undefined,
): string {
  const base = RECURRING_SCHEDULE_OPTIONS.find((option) => option.id === schedule)?.label ?? schedule
  if (schedule === 'weekly' && weeklyWeekday !== null && weeklyWeekday !== undefined) {
    const day = RECURRING_WEEKDAY_LABELS_DE[weeklyWeekday] ?? 'Wochentag'
    return `${base} — ${day}`
  }
  return base
}

/** Soll an diesem Kalendertag eine Quest aus der Vorlage erzeugt werden? */
export function recurringScheduleMatchesDate(input: {
  schedule: RecurringQuestSchedule
  anchorDate: string
  taskDate: string
  weeklyWeekday?: number | null
  endsOn?: string | null
}): boolean {
  const taskDate = normalizeDateKey(input.taskDate)
  const anchorDate = normalizeDateKey(input.anchorDate)
  if (!taskDate || !anchorDate) return false
  if (taskDate < anchorDate) return false

  const endsOn = input.endsOn ? normalizeDateKey(input.endsOn) : null
  if (endsOn && taskDate > endsOn) return false

  switch (input.schedule) {
    case 'daily':
      return true
    case 'weekdays': {
      const dow = cetWeekdayIndex(taskDate)
      return dow >= 1 && dow <= 5
    }
    case 'every_other_day':
      return cetDaysBetween(anchorDate, taskDate) % 2 === 0
    case 'weekly': {
      if (input.weeklyWeekday === null || input.weeklyWeekday === undefined) return false
      return cetWeekdayIndex(taskDate) === input.weeklyWeekday
    }
    default:
      return false
  }
}
