import { cetToday } from '../cetDate'
import { supabase } from '../supabase'
import type { ChildWithTodayXp, DailyXpEntry, XpEntrySource } from './types'
import type { ChildProfile } from './types'

export async function recordDailyXpEntry(input: {
  familyId: string
  childId: string
  entryDate: string
  source: XpEntrySource
  sourceId?: string | null
  xpAmount: number
  metadata?: Record<string, unknown>
}): Promise<Error | null> {
  const { error } = await supabase.from('daily_xp_entries').insert({
    family_id: input.familyId,
    child_id: input.childId,
    entry_date: input.entryDate,
    source: input.source,
    source_id: input.sourceId ?? null,
    xp_amount: input.xpAmount,
    metadata: input.metadata ?? {},
  })

  if (error) {
    if (error.code === '23505') {
      return new Error('XP-Eintrag für heute existiert bereits.')
    }
    return new Error(error.message)
  }
  return null
}

export async function fetchTodayXpByChild(
  familyId: string,
  entryDate = cetToday(),
): Promise<{ totals: Record<string, number>; error: Error | null }> {
  const { data, error } = await supabase
    .from('daily_xp_entries')
    .select('child_id, xp_amount')
    .eq('family_id', familyId)
    .eq('entry_date', entryDate)

  if (error) return { totals: {}, error: new Error(error.message) }

  const totals: Record<string, number> = {}
  for (const row of data ?? []) {
    const childId = row.child_id as string
    const amount = typeof row.xp_amount === 'number' ? row.xp_amount : 0
    totals[childId] = (totals[childId] ?? 0) + amount
  }
  return { totals, error: null }
}

export async function attachTodayXpToChildren(
  children: ChildProfile[],
  familyId: string,
  entryDate = cetToday(),
): Promise<{ children: ChildWithTodayXp[]; error: Error | null }> {
  const { totals, error } = await fetchTodayXpByChild(familyId, entryDate)
  if (error) return { children: [], error }

  return {
    children: children.map((child) => ({
      ...child,
      todayXp: totals[child.id] ?? 0,
    })),
    error: null,
  }
}

export async function fetchXpEntriesForChild(
  childId: string,
  limit = 30,
): Promise<{ entries: DailyXpEntry[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('daily_xp_entries')
    .select('*')
    .eq('child_id', childId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { entries: [], error: new Error(error.message) }
  return { entries: (data ?? []) as DailyXpEntry[], error: null }
}
