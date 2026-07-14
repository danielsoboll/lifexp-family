import {
  cetDateKeyFromIso,
  cetDateRangeInclusive,
  cetToday,
  normalizeDateKey,
} from '../cetDate'
import { getStoredFamilyId } from '../familySession'
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

function assertSessionFamilyId(familyId: string): Error | null {
  const storedFamilyId = getStoredFamilyId()
  if (storedFamilyId && storedFamilyId !== familyId) {
    return new Error('Familien-Session passt nicht — bitte neu laden.')
  }
  return null
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

/** Verlauf beginnt am Familien-Gründungstag (CET/CEST) — nie davor. */
export function familyHistoryStartDateFromCreatedAt(createdAt: string | undefined): string {
  if (!createdAt) return cetToday()
  const key = cetDateKeyFromIso(createdAt)
  return key || cetToday()
}

function memberHistoryKey(member: MemberXpHistoryKey): string {
  return `${member.memberKind}:${member.memberId}`
}

/** Verlauf beginnt am Familien-Gründungstag (Europe/Berlin) — nie davor. */
async function resolveFamilyHistoryStartDate(familyId: string): Promise<string> {
  const todayKey = cetToday()

  const { data: familyRow } = await supabase
    .from('families')
    .select('created_at')
    .eq('id', familyId)
    .maybeSingle()

  if (familyRow?.created_at && typeof familyRow.created_at === 'string') {
    return familyHistoryStartDateFromCreatedAt(familyRow.created_at)
  }
  return todayKey
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
  /** Bereits geladen (z. B. family.created_at) — spart Roundtrip. */
  startDate?: string
  /** Bereits geladen (z. B. Summe todayXp) — spart Live-Abfrage. */
  liveTodayTotal?: number
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

  const sessionError = assertSessionFamilyId(input.familyId)
  if (sessionError) {
    return { startDate: endDate, endDate, days: [], target, max, error: sessionError }
  }

  const startDate = input.startDate ?? (await resolveFamilyHistoryStartDate(input.familyId))
  const dateKeys = cetDateRangeInclusive(startDate, endDate)

  const historyQuery = supabase
    .from('family_daily_xp_history')
    .select('score_date,total_xp')
    .eq('family_id', input.familyId)
    .gte('score_date', startDate)
    .lte('score_date', endDate)
    .order('score_date', { ascending: true })

  const [{ data, error }, liveResult] = await Promise.all([
    historyQuery,
    input.liveTodayTotal !== undefined
      ? Promise.resolve(null)
      : fetchTodayXpTotalsForFamily(input.familyId, endDate),
  ])

  if (error) {
    return { startDate, endDate, days: [], target, max, error: new Error(error.message) }
  }

  let liveTodayTotal = input.liveTodayTotal
  if (liveTodayTotal === undefined) {
    if (liveResult?.error) {
      return { startDate, endDate, days: [], target, max, error: liveResult.error }
    }
    liveTodayTotal =
      Object.values(liveResult!.childTotals).reduce((sum, xp) => sum + Math.max(0, xp), 0)
      + Object.values(liveResult!.parentTotals).reduce((sum, xp) => sum + Math.max(0, xp), 0)
  }

  const totalsByDate = new Map<string, number>()
  for (const row of data ?? []) {
    const date = normalizeDateKey(row.score_date)
    if (!date) continue
    totalsByDate.set(date, floorXp(row.total_xp))
  }

  let days = dateKeys.map((date) => ({ date, xp: totalsByDate.get(date) ?? 0 }))
  days = mergeTodayIntoDays(days, endDate, liveTodayTotal)

  return { startDate, endDate, days, target, max, error: null }
}

export async function fetchMemberXpHistory(input: {
  familyId: string
  member: MemberXpHistoryKey
  liveTodayXp?: number
  startDate?: string
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

  const sessionError = assertSessionFamilyId(input.familyId)
  if (sessionError) {
    return { startDate: endDate, endDate, days: [], target, max, error: sessionError }
  }

  const startDate = input.startDate ?? (await resolveFamilyHistoryStartDate(input.familyId))
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

/** Alle Mitglieder in einer Abfrage — statt N Roundtrips. */
export async function fetchMemberXpHistoriesBatch(input: {
  familyId: string
  members: readonly MemberXpHistoryKey[]
  startDate?: string
  liveTodayXpByKey?: Readonly<Record<string, number>>
}): Promise<{
  startDate: string
  endDate: string
  byMember: Record<string, XpHistoryDay[]>
  target: number
  max: number
  error: Error | null
}> {
  const endDate = cetToday()
  const target = MEMBER_DAILY_XP_TARGET
  const max = MEMBER_DAILY_XP_MAX

  const sessionError = assertSessionFamilyId(input.familyId)
  if (sessionError) {
    return { startDate: endDate, endDate, byMember: {}, target, max, error: sessionError }
  }

  if (input.members.length === 0) {
    const startDate = input.startDate ?? endDate
    return { startDate, endDate, byMember: {}, target, max, error: null }
  }

  const startDate = input.startDate ?? (await resolveFamilyHistoryStartDate(input.familyId))
  const dateKeys = cetDateRangeInclusive(startDate, endDate)

  const { data, error } = await supabase
    .from('member_daily_xp_history')
    .select('score_date,member_kind,member_id,daily_xp')
    .eq('family_id', input.familyId)
    .gte('score_date', startDate)
    .lte('score_date', endDate)
    .order('score_date', { ascending: true })

  if (error) {
    return { startDate, endDate, byMember: {}, target, max, error: new Error(error.message) }
  }

  const totalsByMemberDate = new Map<string, Map<string, number>>()
  for (const member of input.members) {
    totalsByMemberDate.set(memberHistoryKey(member), new Map())
  }

  for (const row of data ?? []) {
    const memberKind = row.member_kind as MemberXpHistoryKey['memberKind']
    const memberId = row.member_id as string
    const key = memberHistoryKey({ memberKind, memberId })
    const dateMap = totalsByMemberDate.get(key)
    if (!dateMap) continue
    const date = normalizeDateKey(row.score_date)
    if (!date) continue
    dateMap.set(date, floorXp(row.daily_xp))
  }

  const byMember: Record<string, XpHistoryDay[]> = {}
  for (const member of input.members) {
    const key = memberHistoryKey(member)
    const totalsByDate = totalsByMemberDate.get(key) ?? new Map()
    let days = dateKeys.map((date) => ({ date, xp: totalsByDate.get(date) ?? 0 }))
    const liveToday = input.liveTodayXpByKey?.[key]
    days = mergeTodayIntoDays(
      days,
      endDate,
      floorXp(liveToday ?? totalsByDate.get(endDate) ?? 0),
    )
    byMember[key] = days
  }

  return { startDate, endDate, byMember, target, max, error: null }
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
