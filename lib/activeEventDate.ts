import { cetToday, cetYesterday, getLocalDateKey } from './cetDate'

/** sessionStorage: gesetztes Datum im Format YYYY-MM-DD (nur „gestern“ erlaubt). */
const STORAGE_KEY = 'lifexp-view-event-date'

export const LIFEXP_VIEW_DATE_CHANGED_EVENT = 'lifexp-view-date-changed'

export const YESTERDAY_ENTRY_FOCUS_PARAM = 'yesterday-entry'
export const YESTERDAY_ENTRY_ELEMENT_ID = 'lifexp-yesterday-entry'

export function yesterdayEntryHomeHref(): string {
  return `/?focus=${YESTERDAY_ENTRY_FOCUS_PARAM}`
}

export function stripYesterdayEntryFocusFromUrl(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (params.get('focus') !== YESTERDAY_ENTRY_FOCUS_PARAM) return false
  params.delete('focus')
  const q = params.toString()
  const path = window.location.pathname
  const next = q ? `${path}?${q}` : path
  window.history.replaceState(null, '', `${next}${window.location.hash}`)
  return true
}

function dispatchViewDateChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(LIFEXP_VIEW_DATE_CHANGED_EVENT))
}

/**
 * Kalendertag für XP-, Mahlzeiten- und Tagesauswahl-Queries (Europe/Berlin).
 * Standard: heute. Im „Gestern“-Modus: gestern.
 */
export function getActiveEventDate(): string {
  if (typeof window === 'undefined') return getLocalDateKey()
  const raw = sessionStorage.getItem(STORAGE_KEY)?.trim()
  const y = cetYesterday()
  if (raw === y) return y
  return getLocalDateKey()
}

export function isYesterdayViewActive(): boolean {
  return getActiveEventDate() === cetYesterday()
}

export function setYesterdayView(): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(STORAGE_KEY, cetYesterday())
  dispatchViewDateChanged()
}

export function setTodayView(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(STORAGE_KEY)
  dispatchViewDateChanged()
}
