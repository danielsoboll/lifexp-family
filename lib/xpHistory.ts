import { cetDateRangeInclusive, getLocalDateKey, normalizeDateKey } from './cetDate'
import { fetchCurrentProfile } from './profile'
import { supabase } from './supabase'
import { getActiveUserId } from './user'
import type { DailyXpEventCategory } from './xpEvents'
import { XP_TARGETS, xpMaxForCategory } from './xpDisplay'

export type XpHistoryDay = {
  date: string
  xp: number
}

export const XP_HISTORY_CATEGORIES = [
  'bewegung',
  'ernaehrung',
  'wissen',
  'mein_tag',
  'plus',
] as const satisfies readonly DailyXpEventCategory[]

export function isXpHistoryCategory(value: string): value is DailyXpEventCategory {
  return (XP_HISTORY_CATEGORIES as readonly string[]).includes(value)
}

export function xpHistoryPath(category: DailyXpEventCategory): string {
  return `/xp/historie/${category}`
}

export const XP_HISTORY_LABELS: Record<
  DailyXpEventCategory,
  { title: string; shortTitle: string; icon: string }
> = {
  bewegung: { title: 'Trainings-XP Historie', shortTitle: 'Trainings-XP', icon: '🏃' },
  ernaehrung: { title: 'Ernährungs-XP Historie', shortTitle: 'Ernährungs-XP', icon: '🥗' },
  wissen: { title: 'Wissens-XP Historie', shortTitle: 'Wissens-XP', icon: '📚' },
  mein_tag: { title: 'Mein Tag-XP Historie', shortTitle: 'Mein Tag-XP', icon: '🌤️' },
  plus: { title: 'Plus-XP Historie', shortTitle: 'Plus-XP', icon: '➕' },
}

function floorXp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value))
  return 0
}

export async function fetchCategoryXpHistory(category: DailyXpEventCategory): Promise<{
  startDate: string
  endDate: string
  days: XpHistoryDay[]
  target: number
  max: number
  error: Error | null
}> {
  const target = XP_TARGETS[category]
  const max = xpMaxForCategory(category)
  const endDate = getLocalDateKey()

  const userId = getActiveUserId()
  if (!userId) {
    return {
      startDate: endDate,
      endDate,
      days: [],
      target,
      max,
      error: new Error('Kein Benutzer. Bitte Onboarding abschließen.'),
    }
  }

  const { settings, error: profileError } = await fetchCurrentProfile()
  if (profileError) {
    return { startDate: endDate, endDate, days: [], target, max, error: profileError }
  }

  const startDate = settings.startDate || endDate
  const dates = cetDateRangeInclusive(startDate, endDate)

  const { data, error } = await supabase
    .from('xp_events')
    .select('event_date,xp')
    .eq('user_id', userId)
    .eq('category', category)
    .gte('event_date', startDate)
    .lte('event_date', endDate)

  if (error) {
    return { startDate, endDate, days: [], target, max, error: new Error(error.message) }
  }

  const totalsByDate = new Map<string, number>()
  for (const row of data ?? []) {
    if (!row || typeof row !== 'object') continue
    const record = row as Record<string, unknown>
    const date = normalizeDateKey(record.event_date)
    if (!date) continue
    totalsByDate.set(date, (totalsByDate.get(date) ?? 0) + floorXp(record.xp))
  }

  const days = dates.map((date) => ({ date, xp: totalsByDate.get(date) ?? 0 }))
  return { startDate, endDate, days, target, max, error: null }
}
