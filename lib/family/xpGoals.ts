import { supabase } from '../supabase'
import type { MemberXpHistoryKey, XpHistoryDay } from './xpHistory'

export const DEFAULT_FAMILY_XP_GOAL_TARGET = 120
export const DEFAULT_MEMBER_XP_GOAL_TARGET = 50

export type XpGoalPeriod = {
  id: string
  targetXp: number
  progressXp: number
  startedAt: string
  /** Intern — in der UI vorerst nicht anzeigen */
  goalName: string
}

function mapGoalRow(row: Record<string, unknown> | null): XpGoalPeriod | null {
  if (!row) return null
  const id = typeof row.id === 'string' ? row.id : ''
  if (!id) return null
  return {
    id,
    targetXp: typeof row.target_xp === 'number' ? row.target_xp : DEFAULT_FAMILY_XP_GOAL_TARGET,
    progressXp: typeof row.progress_xp === 'number' ? row.progress_xp : 0,
    startedAt: typeof row.started_at === 'string' ? row.started_at.slice(0, 10) : '',
    goalName: typeof row.goal_name === 'string' ? row.goal_name : '',
  }
}

export function sumHistoryXp(days: readonly XpHistoryDay[]): number {
  return days.reduce((sum, day) => sum + Math.max(0, day.xp), 0)
}

export async function syncAllXpGoalsForFamily(familyId: string): Promise<Error | null> {
  const { error } = await supabase.rpc('sync_all_xp_goals_for_family', {
    p_family_id: familyId,
  })
  if (error) return new Error(error.message)
  return null
}

export async function fetchActiveFamilyXpGoal(familyId: string): Promise<{
  goal: XpGoalPeriod | null
  error: Error | null
}> {
  const { data, error } = await supabase
    .from('family_xp_goal_periods')
    .select('id,goal_name,target_xp,progress_xp,started_at')
    .eq('family_id', familyId)
    .is('ended_at', null)
    .maybeSingle()

  if (error) {
    if (error.message.includes('schema cache') || error.message.includes('does not exist')) {
      return {
        goal: {
          id: 'fallback',
          goalName: 'Familienziel',
          targetXp: DEFAULT_FAMILY_XP_GOAL_TARGET,
          progressXp: 0,
          startedAt: '',
        },
        error: null,
      }
    }
    return { goal: null, error: new Error(error.message) }
  }

  return { goal: mapGoalRow(data as Record<string, unknown>), error: null }
}

export async function fetchActiveMemberXpGoal(
  familyId: string,
  member: MemberXpHistoryKey,
): Promise<{ goal: XpGoalPeriod | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('member_xp_goal_periods')
    .select('id,goal_name,target_xp,progress_xp,started_at')
    .eq('family_id', familyId)
    .eq('member_kind', member.memberKind)
    .eq('member_id', member.memberId)
    .is('ended_at', null)
    .maybeSingle()

  if (error) {
    if (error.message.includes('schema cache') || error.message.includes('does not exist')) {
      return {
        goal: {
          id: 'fallback',
          goalName: 'Persönliches Ziel',
          targetXp: DEFAULT_MEMBER_XP_GOAL_TARGET,
          progressXp: 0,
          startedAt: '',
        },
        error: null,
      }
    }
    return { goal: null, error: new Error(error.message) }
  }

  return { goal: mapGoalRow(data as Record<string, unknown>), error: null }
}
