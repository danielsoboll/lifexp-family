import { getLocalDateKey } from '../cetDate'
import { getStoredFamilyId } from '../familySession'
import { supabase } from '../supabase'
import { MEMBER_HAS_XP_ERROR, memberHasCollectedDayXp } from './memberRemovable'

async function assertValidFamilySession(familyId: string): Promise<{ error: Error | null }> {
  const storedFamilyId = getStoredFamilyId()
  if (!storedFamilyId || storedFamilyId !== familyId) {
    return { error: new Error('Keine gültige Familien-Session.') }
  }
  return { error: null }
}

async function assertMemberHasNoDayXp(input: {
  familyId: string
  memberKind: 'parent' | 'child'
  memberId: string
}): Promise<{ error: Error | null }> {
  const { hasXp, error } = await memberHasCollectedDayXp(input)
  if (error) return { error }
  if (hasXp) return { error: new Error(MEMBER_HAS_XP_ERROR) }
  return { error: null }
}

async function clearMemberXpHistory(input: {
  familyId: string
  memberKind: 'parent' | 'child'
  memberId: string
}): Promise<void> {
  await supabase
    .from('member_daily_xp_history')
    .delete()
    .eq('family_id', input.familyId)
    .eq('member_kind', input.memberKind)
    .eq('member_id', input.memberId)
}

async function resyncFamilyXpHistoryToday(familyId: string): Promise<void> {
  await supabase.rpc('sync_family_xp_history', {
    p_family_id: familyId,
    p_score_date: getLocalDateKey(),
  })
}

export async function deleteFamilyById(familyId: string): Promise<{ error: Error | null }> {
  const sessionError = await assertValidFamilySession(familyId)
  if (sessionError.error) return sessionError

  const { error } = await supabase.from('families').delete().eq('id', familyId)
  if (error) return { error: new Error(error.message) }
  return { error: null }
}

export async function deleteParentById(parentId: string, familyId: string): Promise<{ error: Error | null }> {
  const sessionError = await assertValidFamilySession(familyId)
  if (sessionError.error) return sessionError

  const { data: membership, error: membershipError } = await supabase
    .from('family_members')
    .select('role')
    .eq('family_id', familyId)
    .eq('parent_id', parentId)
    .maybeSingle()

  if (membershipError) return { error: new Error(membershipError.message) }
  if (!membership) return { error: new Error('Familienmitglied nicht gefunden.') }
  if (membership.role === 'owner') {
    return { error: new Error('Der Inhaber kann nicht entfernt werden.') }
  }

  const { count, error: countError } = await supabase
    .from('family_members')
    .select('*', { count: 'exact', head: true })
    .eq('family_id', familyId)
    .in('role', ['owner', 'parent'])

  if (countError) return { error: new Error(countError.message) }
  if ((count ?? 0) <= 1) {
    return { error: new Error('Es muss mindestens ein Erwachsener in der Familie bleiben.') }
  }

  const xpError = await assertMemberHasNoDayXp({ familyId, memberKind: 'parent', memberId: parentId })
  if (xpError.error) return xpError

  await clearMemberXpHistory({ familyId, memberKind: 'parent', memberId: parentId })

  const { error } = await supabase.from('parent_profiles').delete().eq('id', parentId)
  if (error) return { error: new Error(error.message) }

  await resyncFamilyXpHistoryToday(familyId)
  return { error: null }
}

export async function deleteChildById(childId: string, familyId: string): Promise<{ error: Error | null }> {
  const sessionError = await assertValidFamilySession(familyId)
  if (sessionError.error) return sessionError

  const xpError = await assertMemberHasNoDayXp({ familyId, memberKind: 'child', memberId: childId })
  if (xpError.error) return xpError

  await clearMemberXpHistory({ familyId, memberKind: 'child', memberId: childId })

  const { error } = await supabase.from('child_profiles').delete().eq('id', childId).eq('family_id', familyId)
  if (error) return { error: new Error(error.message) }

  await resyncFamilyXpHistoryToday(familyId)
  return { error: null }
}
