import { getLocalDateKey } from '../cetDate'
import { getStoredFamilyId, readFamilySession } from '../familySession'
import { supabase } from '../supabase'
import { fetchChildById } from './children'
import { fetchParentById } from './families'
import { sessionHasAdminAccess } from './memberAdmin'
import { MEMBER_HAS_XP_ERROR, memberHasCollectedDayXp } from './memberRemovable'
import { fetchMemberRoleForParent, isAdminRole } from './members'
import { QUEST_COMPLETION_PHOTOS_BUCKET } from './questCompletionPlus'

async function assertValidFamilySession(familyId: string): Promise<{ error: Error | null }> {
  const storedFamilyId = getStoredFamilyId()
  if (!storedFamilyId || storedFamilyId !== familyId) {
    return { error: new Error('Keine gültige Familien-Session.') }
  }
  return { error: null }
}

export async function assertFamilyAdminSession(familyId: string): Promise<{ error: Error | null }> {
  const sessionError = await assertValidFamilySession(familyId)
  if (sessionError.error) return sessionError

  const session = readFamilySession()
  if (!session) return { error: new Error('Keine gültige Familien-Session.') }

  if (session.memberKind === 'parent') {
    const [{ parent, error: parentError }, { role, error: roleError }] = await Promise.all([
      fetchParentById(session.memberId),
      fetchMemberRoleForParent(familyId, session.memberId),
    ])
    if (parentError) return { error: parentError }
    if (roleError) return { error: roleError }
    if (!parent) return { error: new Error('Profil nicht gefunden.') }
    if (!sessionHasAdminAccess('parent', parent.can_admin, isAdminRole(role))) {
      return { error: new Error('Nur Familien-Admins können diese Aktion ausführen.') }
    }
    return { error: null }
  }

  const { child, error: childError } = await fetchChildById(session.memberId)
  if (childError) return { error: childError }
  if (!child || child.family_id !== familyId) {
    return { error: new Error('Profil nicht gefunden.') }
  }
  if (!sessionHasAdminAccess('child', child.can_admin)) {
    return { error: new Error('Nur Familien-Admins können diese Aktion ausführen.') }
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

export async function resyncFamilyXpHistoryForDate(familyId: string, scoreDate: string): Promise<void> {
  await supabase.rpc('sync_family_xp_history', {
    p_family_id: familyId,
    p_score_date: scoreDate,
  })
}

function isMissingRelationError(error: { message?: string; code?: string }): boolean {
  return Boolean(
    error.code === 'PGRST205' ||
      error.code === '42P01' ||
      error.message?.includes('schema cache') ||
      error.message?.includes('does not exist'),
  )
}

async function deleteRowsByFamilyId(table: string, familyId: string): Promise<Error | null> {
  const { error } = await supabase.from(table).delete().eq('family_id', familyId)
  if (!error) return null
  if (isMissingRelationError(error)) return null
  return new Error(error.message)
}

async function deleteQuestCompletionStorageForFamily(familyId: string): Promise<void> {
  const { data: completionFolders, error: listError } = await supabase.storage
    .from(QUEST_COMPLETION_PHOTOS_BUCKET)
    .list(familyId)

  if (listError || !completionFolders?.length) return

  const paths: string[] = []
  for (const folder of completionFolders) {
    const prefix = `${familyId}/${folder.name}`
    const { data: files } = await supabase.storage.from(QUEST_COMPLETION_PHOTOS_BUCKET).list(prefix)
    for (const file of files ?? []) {
      paths.push(`${prefix}/${file.name}`)
    }
  }

  if (paths.length > 0) {
    await supabase.storage.from(QUEST_COMPLETION_PHOTOS_BUCKET).remove(paths)
  }
}

async function deleteOrphanedParentProfiles(parentIds: readonly string[]): Promise<void> {
  for (const parentId of parentIds) {
    const { count, error } = await supabase
      .from('family_members')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', parentId)

    if (error || (count ?? 0) > 0) continue

    await supabase.from('parent_profiles').delete().eq('id', parentId)
  }
}

export async function deleteFamilyById(familyId: string): Promise<{ error: Error | null }> {
  const adminError = await assertFamilyAdminSession(familyId)
  if (adminError.error) return adminError

  const { data: memberships, error: membershipError } = await supabase
    .from('family_members')
    .select('parent_id')
    .eq('family_id', familyId)

  if (membershipError) return { error: new Error(membershipError.message) }

  const parentIds = [...new Set((memberships ?? []).map((row) => row.parent_id as string))]

  await deleteQuestCompletionStorageForFamily(familyId)

  const prepTables = [
    'quest_completion_creator_reactions',
    'quest_completion_assignee_photos',
    'reward_redemptions',
    'member_personal_goal_tracking',
    'member_personal_goals',
    'member_daily_xp_history',
    'family_daily_xp_history',
  ] as const

  for (const table of prepTables) {
    const prepError = await deleteRowsByFamilyId(table, familyId)
    if (prepError) return { error: prepError }
  }

  const { data: deleted, error } = await supabase.from('families').delete().eq('id', familyId).select('id')

  if (error) {
    const message = error.message.includes('foreign key')
      ? `${error.message} — Bitte supabase/family_delete_cascade_fix.sql in Supabase ausführen.`
      : error.message
    return { error: new Error(message) }
  }

  if (!deleted?.length) {
    return {
      error: new Error('Familie konnte nicht gelöscht werden — keine Berechtigung oder unbekannte Familien-ID.'),
    }
  }

  await deleteOrphanedParentProfiles(parentIds)
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
