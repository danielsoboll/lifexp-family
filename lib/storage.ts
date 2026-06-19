import { daysBetweenDateKeysInclusive, getLocalDateKey, normalizeDateKey } from './cetDate'
import { DEFAULT_PRIMARY_GOAL, normalizePrimaryGoal, type PrimaryGoal } from './goals'

export type { PrimaryGoal }
export type XpCategory = 'bewegung' | 'ernaehrung' | 'meinTag' | 'plus'

export type XpByCategory = Record<XpCategory, number>

const STORAGE_KEY = 'lifexp-xp-by-category'
const KNOWLEDGE_XP_KEY = 'lifexp-knowledge-xp'
const SIGNUP_DATE_KEY = 'lifexp-signup-date'
const PRIMARY_GOAL_KEY = 'lifexp-primary-goal'
const LEGACY_POINTS_KEY = 'points'
const CELEBRATE_EVT_KEY = 'lifexp_celebrate_evt'
const CELEBRATE_ACK_KEY = 'lifexp_celebrate_ack'

export function defaultXpState(): XpByCategory {
  return { bewegung: 0, ernaehrung: 0, meinTag: 0, plus: 0 }
}

function normalizeState(raw: unknown): XpByCategory | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const d = defaultXpState()
  for (const key of Object.keys(d) as XpCategory[]) {
    const v = o[key]
    if (typeof v === 'number' && Number.isFinite(v)) {
      d[key] = Math.max(0, Math.floor(v))
    }
  }
  return d
}

export function loadXpState(): XpByCategory {
  if (typeof window === 'undefined') return defaultXpState()

  const json = localStorage.getItem(STORAGE_KEY)
  if (json) {
    try {
      const parsed = normalizeState(JSON.parse(json))
      if (parsed) return parsed
    } catch {
      /* ignore */
    }
  }

  const legacy = localStorage.getItem(LEGACY_POINTS_KEY)
  const legacyNum = legacy ? parseInt(legacy, 10) : 0
  if (legacyNum > 0 && !Number.isNaN(legacyNum)) {
    const migrated: XpByCategory = { ...defaultXpState(), bewegung: legacyNum }
    saveXpState(migrated)
    localStorage.removeItem(LEGACY_POINTS_KEY)
    return migrated
  }

  return defaultXpState()
}

export function saveXpState(state: XpByCategory) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function getTotalXp(state: XpByCategory): number {
  return state.bewegung + state.ernaehrung + state.meinTag + state.plus
}

export function loadKnowledgeXp(): number {
  if (typeof window === 'undefined') return 0
  const raw = localStorage.getItem(KNOWLEDGE_XP_KEY)
  const value = raw ? parseInt(raw, 10) : 0
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

export function addKnowledgeXp(delta: number): number {
  if (typeof window === 'undefined') return 0
  const next = Math.max(0, loadKnowledgeXp() + Math.floor(delta))
  localStorage.setItem(KNOWLEDGE_XP_KEY, String(next))
  return next
}

export function initSignupDate() {
  if (typeof window === 'undefined') return
  localStorage.setItem(SIGNUP_DATE_KEY, `${getLocalDateKey()}T12:00:00.000Z`)
}

/** Bei Account-Wiederherstellung: Signup-Datum aus Profil-`start_date`. */
export function saveSignupDateFromProfileStartDate(startDate: string) {
  if (typeof window === 'undefined') return
  const day = normalizeDateKey(startDate)
  if (day) {
    localStorage.setItem(SIGNUP_DATE_KEY, `${day}T12:00:00.000Z`)
    return
  }
  initSignupDate()
}

export function getLifeXpSignupDays(): number {
  if (typeof window === 'undefined') return 1
  const stored = localStorage.getItem(SIGNUP_DATE_KEY)
  const startKey = normalizeDateKey(stored) || getLocalDateKey()
  if (!stored) {
    localStorage.setItem(SIGNUP_DATE_KEY, `${startKey}T12:00:00.000Z`)
  }
  return daysBetweenDateKeysInclusive(startKey, getLocalDateKey())
}

export function loadPrimaryGoal(): PrimaryGoal {
  if (typeof window === 'undefined') return DEFAULT_PRIMARY_GOAL
  return normalizePrimaryGoal(localStorage.getItem(PRIMARY_GOAL_KEY))
}

export function savePrimaryGoal(goal: PrimaryGoal) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PRIMARY_GOAL_KEY, goal)
}

/** Neuen Stand für eine Kategorie setzen und persistieren. */
export function setCategoryXp(category: XpCategory, value: number): number {
  const state = loadXpState()
  const next = Math.max(0, Math.floor(value))
  state[category] = next
  saveXpState(state)
  return next
}

/** XP einer Kategorie addieren; gibt den neuen Kategorie-Stand zurück. */
export function addCategoryXp(category: XpCategory, delta: number): number {
  const state = loadXpState()
  const next = Math.max(0, state[category] + delta)
  state[category] = next
  saveXpState(state)
  if (delta > 0) {
    requestHomeXpCelebration()
  }
  return next
}

/** Nach XP-Gewinn: neues Ereignis setzen (überlebt React-Strict-Mode dank Ack). */
export function requestHomeXpCelebration() {
  if (typeof window === 'undefined') return
  try {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
    sessionStorage.setItem(CELEBRATE_EVT_KEY, id)
  } catch {
    /* private mode / quota */
  }
}

/** Gibt es ein unbestätigtes XP-Feier-Signal? (setzt kein Ack — erst bei acknowledgeHomeXpCelebration). */
export function peekHomeXpCelebrationPending(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const evt = sessionStorage.getItem(CELEBRATE_EVT_KEY)
    if (!evt) return false
    const ack = sessionStorage.getItem(CELEBRATE_ACK_KEY)
    return ack !== evt
  } catch {
    return false
  }
}

/** Nach erfolgreichem Start der Startseiten-Animation aufrufen. */
export function acknowledgeHomeXpCelebration(): void {
  if (typeof window === 'undefined') return
  try {
    const evt = sessionStorage.getItem(CELEBRATE_EVT_KEY)
    if (!evt) return
    sessionStorage.setItem(CELEBRATE_ACK_KEY, evt)
  } catch {
    /* ignore */
  }
}

/** @deprecated Nutze peekHomeXpCelebrationPending + acknowledgeHomeXpCelebration. */
export function shouldPlayHomeXpCelebrationFromStorage(): boolean {
  const pending = peekHomeXpCelebrationPending()
  if (pending) acknowledgeHomeXpCelebration()
  return pending
}

export function resetAllXp() {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(CELEBRATE_EVT_KEY)
      sessionStorage.removeItem(CELEBRATE_ACK_KEY)
      sessionStorage.removeItem('lifexp_last_home_total_xp')
      sessionStorage.removeItem('lifexp_last_home_daily_xp')
      sessionStorage.removeItem('lifexp-wjt-bubble-pending')
    } catch {
      /* ignore */
    }
  }
  saveXpState(defaultXpState())
  if (typeof window !== 'undefined') {
    localStorage.setItem(KNOWLEDGE_XP_KEY, '0')
    localStorage.removeItem(SIGNUP_DATE_KEY)
    localStorage.removeItem(LEGACY_POINTS_KEY)
  }
}
