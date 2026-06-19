import {
  acknowledgeHomeXpCelebration,
  peekHomeXpCelebrationPending,
} from './storage'

const LAST_HOME_TOTAL_XP_KEY = 'lifexp_last_home_total_xp'
const LAST_HOME_DAILY_XP_KEY = 'lifexp_last_home_daily_xp'

export function readLastHomeTotalXp(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(LAST_HOME_TOTAL_XP_KEY)
    if (raw === null) return null
    const parsed = parseInt(raw, 10)
    return Number.isFinite(parsed) ? Math.max(0, parsed) : null
  } catch {
    return null
  }
}

export function persistHomeDisplaySnapshot(totalXp: number, dailyXp: number): void {
  writeLastHomeTotalXp(totalXp)
  writeLastHomeDailyXp(dailyXp)
}

function writeLastHomeTotalXp(total: number) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(LAST_HOME_TOTAL_XP_KEY, String(Math.max(0, Math.floor(total))))
  } catch {
    /* ignore */
  }
}

export function readLastHomeDailyXp(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(LAST_HOME_DAILY_XP_KEY)
    if (raw === null) return null
    const parsed = parseInt(raw, 10)
    return Number.isFinite(parsed) ? Math.max(0, parsed) : null
  } catch {
    return null
  }
}

function writeLastHomeDailyXp(daily: number) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(LAST_HOME_DAILY_XP_KEY, String(Math.max(0, Math.floor(daily))))
  } catch {
    /* ignore */
  }
}

export function clearLastHomeTotalXp() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(LAST_HOME_TOTAL_XP_KEY)
    sessionStorage.removeItem(LAST_HOME_DAILY_XP_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Nach Sync auf der Startseite: Feier wenn Gesamt- oder Tages-XP gestiegen sind
 * (z. B. Bild 1_2/1_3 schon sichtbar) oder ein offenes Feier-Signal existiert.
 */
export function shouldCelebrateOnHomeLoad(currentTotalXp: number, currentDailyXp: number): boolean {
  const current = Math.max(0, Math.floor(currentTotalXp))
  const daily = Math.max(0, Math.floor(currentDailyXp))
  const last = readLastHomeTotalXp()
  const lastDaily = readLastHomeDailyXp()
  const pending = peekHomeXpCelebrationPending()

  const totalIncreased = last !== null && current > last
  const dailyIncreased = lastDaily !== null && daily > lastDaily
  const shouldCelebrate = pending || totalIncreased || dailyIncreased

  persistHomeDisplaySnapshot(current, daily)
  return shouldCelebrate
}

export function confirmHomeCelebrationPlayed() {
  acknowledgeHomeXpCelebration()
}
