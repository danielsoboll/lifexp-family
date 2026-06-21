import { cetToday } from '../cetDate'
import { supabase } from '../supabase'
import type { FamilySessionMemberKind } from '../familySession'

export const DAILY_STREAK_XP = 2

export async function fetchMemberStreakClaimedToday(input: {
  familyId: string
  memberKind: FamilySessionMemberKind
  memberId: string
  entryDate?: string
}): Promise<{ claimed: boolean; error: Error | null }> {
  const entryDate = input.entryDate ?? cetToday()
  const column = input.memberKind === 'parent' ? 'parent_id' : 'child_id'

  const { data, error } = await supabase
    .from('daily_xp_entries')
    .select('id')
    .eq('family_id', input.familyId)
    .eq('entry_date', entryDate)
    .eq('source', 'streak')
    .eq(column, input.memberId)
    .limit(1)

  if (error) {
    if (error.message.includes('parent_id') || error.message.includes('schema cache')) {
      return { claimed: false, error: null }
    }
    return { claimed: false, error: new Error(error.message) }
  }

  return { claimed: (data ?? []).length > 0, error: null }
}

export async function claimMemberDailyStreak(input: {
  familyId: string
  memberKind: FamilySessionMemberKind
  memberId: string
}): Promise<{ error: Error | null }> {
  const entryDate = cetToday()
  const row =
    input.memberKind === 'parent'
      ? {
          family_id: input.familyId,
          parent_id: input.memberId,
          child_id: null,
          entry_date: entryDate,
          source: 'streak' as const,
          source_id: null,
          xp_amount: DAILY_STREAK_XP,
          metadata: { kind: 'daily_checkin' },
        }
      : {
          family_id: input.familyId,
          child_id: input.memberId,
          parent_id: null,
          entry_date: entryDate,
          source: 'streak' as const,
          source_id: null,
          xp_amount: DAILY_STREAK_XP,
          metadata: { kind: 'daily_checkin' },
        }

  const { error } = await supabase.from('daily_xp_entries').insert(row as Record<string, unknown>)

  if (error) {
    if (error.code === '23505') return { error: null }
    if (error.message.includes('parent_id') || error.message.includes('streak')) {
      return {
        error: new Error(
          'Tages-Streak benötigt die SQL-Migration — Abschnitt 5 in supabase/pending_migrations.sql.',
        ),
      }
    }
    return { error: new Error(error.message) }
  }

  return { error: null }
}
