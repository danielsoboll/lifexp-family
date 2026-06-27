import { supabase } from '../supabase'
import type { ParentMember } from './members'

export async function memberHasCollectedDayXp(input: {
  familyId: string
  memberKind: 'parent' | 'child'
  memberId: string
}): Promise<{ hasXp: boolean; error: Error | null }> {
  const { familyId, memberKind, memberId } = input

  const { data: historyRow, error: historyError } = await supabase
    .from('member_daily_xp_history')
    .select('daily_xp')
    .eq('family_id', familyId)
    .eq('member_kind', memberKind)
    .eq('member_id', memberId)
    .gt('daily_xp', 0)
    .limit(1)
    .maybeSingle()

  if (!historyError && historyRow) {
    return { hasXp: true, error: null }
  }

  if (memberKind === 'child') {
    const { data, error } = await supabase
      .from('daily_xp_entries')
      .select('id')
      .eq('family_id', familyId)
      .eq('child_id', memberId)
      .gt('xp_amount', 0)
      .limit(1)
      .maybeSingle()

    if (error) return { hasXp: false, error: new Error(error.message) }
    return { hasXp: !!data, error: null }
  }

  const { data: entryRow, error: entryError } = await supabase
    .from('daily_xp_entries')
    .select('id')
    .eq('family_id', familyId)
    .eq('parent_id', memberId)
    .gt('xp_amount', 0)
    .limit(1)
    .maybeSingle()

  if (entryError) return { hasXp: false, error: new Error(entryError.message) }
  if (entryRow) return { hasXp: true, error: null }

  const { data: questRow, error: questError } = await supabase
    .from('quest_completions')
    .select('id')
    .eq('family_id', familyId)
    .eq('parent_id', memberId)
    .gt('xp_awarded', 0)
    .not('creator_confirmed_at', 'is', null)
    .limit(1)
    .maybeSingle()

  if (questError) return { hasXp: false, error: new Error(questError.message) }
  return { hasXp: !!questRow, error: null }
}

export function parentCanBeRemoved(input: {
  parent: ParentMember
  parents: ParentMember[]
  sessionMemberKind: 'parent' | 'child' | null
  sessionMemberId: string | null
  hasXp: boolean
}): boolean {
  const { parent, parents, sessionMemberKind, sessionMemberId, hasXp } = input
  if (hasXp) return false
  if (parent.role === 'owner') return false
  if (sessionMemberKind === 'parent' && sessionMemberId === parent.id) return false
  if (parents.length <= 1) return false
  return true
}

export function childCanBeRemoved(hasXp: boolean): boolean {
  return !hasXp
}

export const MEMBER_HAS_XP_ERROR =
  'Dieses Familienmitglied hat bereits XP gesammelt und kann nicht mehr entfernt werden.'
