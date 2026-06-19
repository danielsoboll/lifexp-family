import { bootstrapClientStorageFromCookies } from './clientStorageBootstrap'
import { cetAddDays, cetToday, cetWeekDatesFromMonday, cetWeekMonday, cetWeekdayShort } from './cetDate'
import { clearBridgedStorage, loadBridgedStorage, saveBridgedStorage } from './lifeexpCookie'

const WEEK_PLAN_MONDAY_KEY = 'lifexp_week_plan_monday'
const WEEK_PLAN_MONDAY_COOKIE = 'lifexp_wpm'

function readStoredWeekPlanMonday(): string | null {
  bootstrapClientStorageFromCookies()
  const raw = loadBridgedStorage(WEEK_PLAN_MONDAY_KEY, WEEK_PLAN_MONDAY_COOKIE)?.trim()
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null
}

function writeWeekPlanMonday(monday: string): void {
  saveBridgedStorage(WEEK_PLAN_MONDAY_KEY, WEEK_PLAN_MONDAY_COOKIE, monday)
}

/** Montag der im Wochenplan angezeigten Woche (≥ Kalenderwoche). */
export function getWeekPlanDisplayMonday(instant: number = Date.now()): string {
  const calendarMonday = cetWeekMonday(instant)
  const stored = readStoredWeekPlanMonday()
  if (!stored || stored < calendarMonday) {
    if (stored && stored < calendarMonday) {
      writeWeekPlanMonday(calendarMonday)
    }
    return calendarMonday
  }
  return stored
}

export function getWeekPlanDisplayDates(instant: number = Date.now()): string[] {
  return cetWeekDatesFromMonday(getWeekPlanDisplayMonday(instant))
}

/** Sonntag: eine Woche weiter planen (alte Woche bleibt in der DB / Historie). */
export function advanceWeekPlanDisplayWeek(instant: number = Date.now()): string {
  const nextMonday = cetAddDays(getWeekPlanDisplayMonday(instant), 7)
  writeWeekPlanMonday(nextMonday)
  return nextMonday
}

export function clearWeekPlanDisplayAnchor(): void {
  clearBridgedStorage(WEEK_PLAN_MONDAY_KEY, WEEK_PLAN_MONDAY_COOKIE)
}

export function isWeekPlanViewingFutureWeek(instant: number = Date.now()): boolean {
  return getWeekPlanDisplayMonday(instant) > cetWeekMonday(instant)
}

/** Sonntag der angezeigten Planungswoche — nach Sprung ausblenden bis zum nächsten Sonntag. */
export function canShowWeekPlanNextWeekButton(instant: number = Date.now()): boolean {
  const today = cetToday(instant)
  if (cetWeekdayShort(today) !== 'So') return false
  return getWeekPlanDisplayDates(instant).includes(today)
}
