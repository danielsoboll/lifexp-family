import {
  cetDateRangeInclusive,
  cetToday,
  getLocalDateKey,
  normalizeDateKey,
} from '../cetDate'
import { supabase } from '../supabase'
import {
  clampMemberDailyXp,
  familyDailyXpChartMax,
  MEMBER_DAILY_XP_MAX,
  MEMBER_DAILY_XP_TARGET,
} from './dailyXpDisplay'
import { fetchTodayXpTotalsForFamily } from './xp'

export type XpHistoryDay = {
  date: string
  xp: number
}

export type MemberXpHistoryKey = {
  memberKind: 'parent' | 'child'
  memberId: string
}

function floorXp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return clampMemberDailyXp(value)
  return 0
}

function mergeTodayIntoDays(days: XpHistoryDay[], todayKey: string, todayXp: number): XpHistoryDay[] {
  if (days.length === 0) {
    return todayXp > 0 ? [{ date: todayKey, xp: todayXp }] : []
  }

  const next = days.map((day) => ({ ...day }))
  const index = next.findIndex((day) => day.date === todayKey)
  if (index >= 0) {
    next[index] = { date: todayKey, xp: todayXp }
    return next
  }

  if (todayKey > next[next.length - 1]!.date) {
    next.push({ date: todayKey, xp: todayXp })
  }
  return next
}

async function resolveFamilyHistoryStartDate(familyId: string): Promise<string> {
  const todayKey = cetToday()

  const [{ data: familyRow }, { data: historyRow }] = await Promise.all([
    supabase.from('families').select('created_at').eq('id', familyId).maybeSingle(),
    supabase
      .from('family_daily_xp_history')
      .select('score_date')
      .eq('family_id', familyId)
      .order('score_date', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  const createdKey =
    familyRow?.created_at && typeof familyRow.created_at === 'string'
      ? getLocalDateKey(Date.parse(familyRow.created_at))
      : todayKey
  const firstHistoryKey = normalizeDateKey(historyRow?.score_date)

  if (firstHistoryKey && firstHistoryKey < createdKey) return firstHistoryKey
  return createdKey
}

export function familyDailyXpTarget(memberCount: number): number {
  return Math.max(0, memberCount) * MEMBER_DAILY_XP_TARGET
}

export function familyDailyXpMax(memberCount: number): number {
  return familyDailyXpChartMax(memberCount)
}

export async function fetchFamilyXpHistory(input: {
  familyId: string
  memberCount: number
}): Promise<{
  startDate: string
  endDate: string
  days: XpHistoryDay[]
  target: number
  max: number
  error: Error | null
}> {
  const endDate = cetToday()
  const target = familyDailyXpTarget(input.memberCount)
  const max = familyDailyXpMax(input.memberCount)

  const startDate = await resolveFamilyHistoryStartDate(input.familyId)
  const dateKeys = cetDateRangeInclusive(startDate, endDate)

  const [{ data, error }, { childTotals, parentTotals, error: liveError }] = await Promise.all([
    supabase
      .from('family_daily_xp_history')
      .select('score_date,total_xp')
      .eq('family_id', input.familyId)
      .gte('score_date', startDate)
      .lte('score_date', endDate)
      .order('score_date', { ascending: true }),
    fetchTodayXpTotalsForFamily(input.familyId, endDate),
  ])

  if (error) {
    return { startDate, endDate, days: [], target, max, error: new Error(error.message) }
  }
  if (liveError) {
    return { startDate, endDate, days: [], target, max, error: liveError }
  }

  const totalsByDate = new Map<string, number>()
  for (const row of data ?? []) {
    const date = normalizeDateKey(row.score_date)
    if (!date) continue
    totalsByDate.set(date, floorXp(row.total_xp))
  }

  let days = dateKeys.map((date) => ({ date, xp: totalsByDate.get(date) ?? 0 }))

  const liveTodayTotal = Object.values(childTotals).reduce((sum, xp) => sum + Math.max(0, xp), 0)
    + Object.values(parentTotals).reduce((sum, xp) => sum + Math.max(0, xp), 0)

  days = mergeTodayIntoDays(days, endDate, liveTodayTotal)

  return { startDate, endDate, days, target, max, error: null }
}

export async function fetchMemberXpHistory(input: {
  familyId: string
  member: MemberXpHistoryKey
  liveTodayXp?: number
}): Promise<{
  startDate: string
  endDate: string
  days: XpHistoryDay[]
  target: number
  max: number
  error: Error | null
}> {
  const endDate = cetToday()
  const target = MEMBER_DAILY_XP_TARGET
  const max = MEMBER_DAILY_XP_MAX
  const startDate = await resolveFamilyHistoryStartDate(input.familyId)
  const dateKeys = cetDateRangeInclusive(startDate, endDate)

  const { data, error } = await supabase
    .from('member_daily_xp_history')
    .select('score_date,daily_xp')
    .eq('family_id', input.familyId)
    .eq('member_kind', input.member.memberKind)
    .eq('member_id', input.member.memberId)
    .gte('score_date', startDate)
    .lte('score_date', endDate)
    .order('score_date', { ascending: true })

  if (error) {
    return { startDate, endDate, days: [], target, max, error: new Error(error.message) }
  }

  const totalsByDate = new Map<string, number>()
  for (const row of data ?? []) {
    const date = normalizeDateKey(row.score_date)
    if (!date) continue
    totalsByDate.set(date, floorXp(row.daily_xp))
  }

  let days = dateKeys.map((date) => ({ date, xp: totalsByDate.get(date) ?? 0 }))
  days = mergeTodayIntoDays(days, endDate, floorXp(input.liveTodayXp ?? totalsByDate.get(endDate) ?? 0))

  return { startDate, endDate, days, target, max, error: null }
}

/** Heute-Snapshot in Historie schreiben (Fallback wenn Migration noch nicht lief). */
export async function syncFamilyXpHistoryToday(familyId: string): Promise<Error | null> {
  const { error } = await supabase.rpc('sync_family_xp_history', {
    p_family_id: familyId,
    p_score_date: cetToday(),
  })

  if (error) return new Error(error.message)
  return null
}
