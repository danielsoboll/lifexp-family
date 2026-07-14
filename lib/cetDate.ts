/**
 * LifeXP-Kalenderzeit — **Europe/Berlin** (deutsche Nutzerperspektive, CET/CEST).
 *
 * Alle Tagesgrenzen (`event_date`, `task_date`, heute/gestern, Wochenplan) laufen über
 * `getLocalDateKey()` und die Hilfsfunktionen in diesem Modul.
 */
export const LIFEXP_LOCAL_TIMEZONE = 'Europe/Berlin'

/** Alias — CET/CEST über IANA `Europe/Berlin` (Sommerzeit automatisch). */
export const CET_TIMEZONE = LIFEXP_LOCAL_TIMEZONE

/** @deprecated Alias für Abwärtskompatibilität. */
export const LIFEXP_TIMEZONE = LIFEXP_LOCAL_TIMEZONE

const DATE_KEY_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: LIFEXP_LOCAL_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const WEEKDAY_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: LIFEXP_LOCAL_TIMEZONE,
  weekday: 'short',
})

const LOCAL_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: LIFEXP_LOCAL_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const LOCAL_HOUR_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: LIFEXP_LOCAL_TIMEZONE,
  hour: 'numeric',
  hour12: false,
})

const LONG_DATE_FORMAT = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: LIFEXP_LOCAL_TIMEZONE,
})

const MEDIUM_DATE_FORMAT = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: LIFEXP_LOCAL_TIMEZONE,
})

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: LIFEXP_LOCAL_TIMEZONE,
})

const WEEKDAY_SHORT_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

const DAY_MS = 86_400_000

/** Kalendertag in Europe/Berlin als `YYYY-MM-DD`. */
export function getLocalDateKey(instant: number = Date.now()): string {
  return DATE_KEY_FORMAT.format(new Date(instant))
}

/** Kalendertag (CET/CEST) aus ISO-Zeitstempel. */
export function cetDateKeyFromIso(iso: string): string {
  const instant = Date.parse(iso)
  if (!Number.isFinite(instant)) return ''
  return getLocalDateKey(instant)
}

/** Aktuelles Kalenderjahr in Europe/Berlin. */
export function cetLocalYear(instant: number = Date.now()): number {
  const key = getLocalDateKey(instant)
  const year = parseInt(key.slice(0, 4), 10)
  return Number.isFinite(year) ? year : new Date(instant).getFullYear()
}

/** DB-/API-Wert auf `YYYY-MM-DD` normalisieren. */
export function normalizeDateKey(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  return ''
}

function parseDateKey(dateKey: string): { year: number; month: number; day: number } | null {
  const normalized = normalizeDateKey(dateKey)
  if (!normalized) return null
  const [year, month, day] = normalized.split('-').map((part) => parseInt(part, 10))
  if (!year || !month || !day) return null
  return { year, month, day }
}

function localWeekday(instant: number): number {
  const token = WEEKDAY_FORMAT.format(new Date(instant)).slice(0, 3)
  return WEEKDAY_MAP[token] ?? 1
}

/** Stabiler Mittags-Anker für Datumsarithmetik in Europe/Berlin. */
function localNoonInstant(dateKey: string): number | null {
  const parts = parseDateKey(dateKey)
  if (!parts) return null
  let instant = Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0) - 14 * 3_600_000
  for (let step = 0; step < 72; step += 1) {
    if (normalizeDateKey(getLocalDateKey(instant)) === normalizeDateKey(dateKey)) {
      const hour = parseInt(LOCAL_HOUR_FORMAT.format(new Date(instant)), 10)
      return instant + (12 - hour) * 3_600_000
    }
    instant += 3_600_000
  }
  return Date.UTC(parts.year, parts.month - 1, parts.day, 11, 0, 0)
}

/** Aktuelles Kalenderdatum (`YYYY-MM-DD`) — Alias für bestehende Aufrufer. */
export function cetToday(instant: number = Date.now()): string {
  return getLocalDateKey(instant)
}

export function cetYesterday(instant: number = Date.now()): string {
  return cetDaysAgo(1, instant)
}

/** Kalendertag, `daysAgo` Tage vor heute (1 = gestern). */
export function cetDaysAgo(daysAgo: number, instant: number = Date.now()): string {
  const n = Math.max(0, Math.floor(daysAgo))
  const todayKey = getLocalDateKey(instant)
  if (n === 0) return todayKey
  const noon = localNoonInstant(todayKey)
  if (noon === null) return todayKey
  return getLocalDateKey(noon - n * DAY_MS)
}

export function cetTomorrow(instant: number = Date.now()): string {
  return cetAddDays(getLocalDateKey(instant), 1)
}

/** Übermorgen (`YYYY-MM-DD`). */
export function cetDayAfterTomorrow(instant: number = Date.now()): string {
  return cetAddDays(getLocalDateKey(instant), 2)
}

/** Montag der Kalenderwoche, `YYYY-MM-DD`. */
export function cetWeekMonday(instant: number = Date.now()): string {
  const dateKey = getLocalDateKey(instant)
  const noon = localNoonInstant(dateKey)
  if (noon === null) return dateKey
  const dow = localWeekday(noon)
  const daysFromMonday = dow === 0 ? 6 : dow - 1
  return getLocalDateKey(noon - daysFromMonday * DAY_MS)
}

/** Sieben Tage ab Montag (Mo–So). */
export function cetWeekDatesFromMonday(monday: string): string[] {
  const start = normalizeDateKey(monday)
  if (!start) return []
  return Array.from({ length: 7 }, (_, index) => cetAddDays(start, index))
}

/** Aktuelle Woche Mo–So. */
export function cetCurrentWeekDates(instant: number = Date.now()): string[] {
  return cetWeekDatesFromMonday(cetWeekMonday(instant))
}

export function cetWeekdayShort(date: string): (typeof WEEKDAY_SHORT_DE)[number] {
  const noon = localNoonInstant(normalizeDateKey(date))
  if (noon === null) return 'Mo'
  return WEEKDAY_SHORT_DE[localWeekday(noon)] ?? 'Mo'
}

/** Wochentag 0=So … 6=Sa (Europe/Berlin). */
export function cetWeekdayIndex(date: string): number {
  const noon = localNoonInstant(normalizeDateKey(date))
  if (noon === null) return 1
  return localWeekday(noon)
}

/** Kalendertage zwischen zwei Keys (0 = gleicher Tag). */
export function cetDaysBetween(startKey: string, endKey: string): number {
  const start = normalizeDateKey(startKey)
  const end = normalizeDateKey(endKey)
  if (!start || !end || end < start) return 0
  return cetDateRangeInclusive(start, end).length - 1
}

/** `DD.MM.` für Kopfzeile im Wochenplan. */
export function cetFormatDayMonth(date: string): string {
  const normalized = normalizeDateKey(date)
  const [, month, day] = normalized.split('-')
  if (!month || !day) return date
  return `${day}.${month}.`
}

/** Kalendertag um `days` verschieben (`YYYY-MM-DD`). */
export function cetAddDays(date: string, days: number): string {
  const dateKey = normalizeDateKey(date)
  if (!dateKey) return date
  const noon = localNoonInstant(dateKey)
  if (noon === null) return dateKey
  return getLocalDateKey(noon + Math.floor(days) * DAY_MS)
}

/** Alle Kalendertage von `start` bis `end` inklusive. */
export function cetDateRangeInclusive(start: string, end: string): string[] {
  const startKey = normalizeDateKey(start)
  const endKey = normalizeDateKey(end)
  if (!startKey || !endKey || endKey < startKey) return []
  const dates: string[] = []
  let cursor = startKey
  while (cursor <= endKey) {
    dates.push(cursor)
    if (cursor === endKey) break
    cursor = cetAddDays(cursor, 1)
  }
  return dates
}

/** Inklusive Anzahl Kalendertage zwischen zwei Keys. */
export function daysBetweenDateKeysInclusive(startKey: string, endKey: string): number {
  return Math.max(1, cetDateRangeInclusive(startKey, endKey).length)
}

/** `DD.MM.YY` für Chart-Achse. */
export function cetFormatShortDate(date: string): string {
  const normalized = normalizeDateKey(date)
  const [year, month, day] = normalized.split('-')
  if (!year || !month || !day) return date
  return `${day}.${month}.${year.slice(-2)}`
}

/** Deutsches Langdatum für Kalendertag (`YYYY-MM-DD`). */
export function cetFormatLongDateDe(date: string): string {
  const noon = localNoonInstant(normalizeDateKey(date))
  if (noon === null) return date
  return LONG_DATE_FORMAT.format(new Date(noon))
}

/** Wanduhr (`HH:MM`) in Europe/Berlin für ISO-Zeitstempel. */
export function cetFormatTimeFromIso(iso: string): string {
  const instant = Date.parse(iso)
  if (!Number.isFinite(instant)) return ''
  return LOCAL_TIME_FORMAT.format(new Date(instant))
}

/** Datum (`13. Juli 2026`) in CET/CEST für ISO-Zeitstempel. */
export function cetFormatDateFromIso(iso: string): string {
  const instant = Date.parse(iso)
  if (!Number.isFinite(instant)) return ''
  return MEDIUM_DATE_FORMAT.format(new Date(instant))
}

/** Datum + Uhrzeit in CET/CEST für ISO-Zeitstempel. */
export function cetFormatDateTimeFromIso(iso: string): string {
  const instant = Date.parse(iso)
  if (!Number.isFinite(instant)) return ''
  return DATE_TIME_FORMAT.format(new Date(instant))
}

/** Wanduhr (`HH:MM`) in Europe/Berlin, auf Viertelstunden abgerundet. */
export function cetQuarterHourTime(instant: number = Date.now()): string {
  const parts = LOCAL_TIME_FORMAT.formatToParts(new Date(instant))
  const hour = parseInt(parts.find((part) => part.type === 'hour')?.value ?? '0', 10)
  const minute = parseInt(parts.find((part) => part.type === 'minute')?.value ?? '0', 10)
  const totalMinutes = hour * 60 + minute
  const rounded = Math.floor(totalMinutes / 15) * 15
  const hours = Math.floor(rounded / 60)
  const minutes = rounded % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}
