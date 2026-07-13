import { getLocalDateKey } from '../cetDate'
import { getStoredFamilyId, readFamilySession } from '../familySession'
import { supabase } from '../supabase'
import { deleteFamilyCascadeDirect } from './deleteFamilyCascade'
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

export async function deleteFamilyById(familyId: string): Promise<{ error: Error | null }> {
  const adminError = await assertFamilyAdminSession(familyId)
  if (adminError.error) return adminError

  const session = readFamilySession()
  if (!session) {
    return { error: new Error('Keine gültige Familien-Session.') }
  }

  try {
    const response = await fetch('/api/family/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        familyId,
        memberId: session.memberId,
        memberKind: session.memberKind,
      }),
    })

    const payload = (await response.json()) as { error?: string }
    if (response.ok) {
      return { error: null }
    }

    if (response.status === 503) {
      return deleteFamilyCascadeDirect(supabase, familyId)
    }

    return { error: new Error(payload.error ?? 'Familie konnte nicht gelöscht werden.') }
  } catch {
    return deleteFamilyCascadeDirect(supabase, familyId)
  }
}

const FAMILY_PROGRESS_RESET_TABLES = [
  'quest_completion_creator_reactions',
  'quest_completion_assignee_photos',
  'reward_redemptions',
  'member_personal_goal_tracking',
  'family_personal_goal_tracking',
  'member_xp_goal_daily_progress',
  'member_daily_xp_history',
  'family_daily_xp_history',
  'family_challenge_progress',
  'quest_completions',
  'daily_xp_entries',
] as const

/**
 * XP, Verlauf und Fortschritt zurücksetzen — Familie, Mitglieder und Quests bleiben erhalten.
 */
export async function resetFamilyProgressById(familyId: string): Promise<{ error: Error | null }> {
  const adminError = await assertFamilyAdminSession(familyId)
  if (adminError.error) return adminError

  await deleteQuestCompletionStorageForFamily(familyId)

  for (const table of FAMILY_PROGRESS_RESET_TABLES) {
    const prepError = await deleteRowsByFamilyId(table, familyId)
    if (prepError) return { error: prepError }
  }

  const now = new Date().toISOString()

  const { error: childXpError } = await supabase
    .from('child_profiles')
    .update({ total_xp: 0, updated_at: now })
    .eq('family_id', familyId)

  if (childXpError && !isMissingRelationError(childXpError)) {
    return { error: new Error(childXpError.message) }
  }

  const goalProgressReset = { progress_xp: 0, completed_at: null, updated_at: now }

  const { error: memberGoalsError } = await supabase
    .from('member_personal_goals')
    .update(goalProgressReset)
    .eq('family_id', familyId)

  if (memberGoalsError && !isMissingRelationError(memberGoalsError)) {
    return { error: new Error(memberGoalsError.message) }
  }

  const { error: familyGoalsError } = await supabase
    .from('family_personal_goals')
    .update(goalProgressReset)
    .eq('family_id', familyId)

  if (familyGoalsError && !isMissingRelationError(familyGoalsError)) {
    return { error: new Error(familyGoalsError.message) }
  }

  const { error: familyXpGoalError } = await supabase
    .from('family_xp_goal_periods')
    .update({ progress_xp: 0, updated_at: now })
    .eq('family_id', familyId)
    .is('ended_at', null)

  if (familyXpGoalError && !isMissingRelationError(familyXpGoalError)) {
    return { error: new Error(familyXpGoalError.message) }
  }

  const { error: memberXpGoalError } = await supabase
    .from('member_xp_goal_periods')
    .update({ progress_xp: 0, updated_at: now })
    .eq('family_id', familyId)
    .is('ended_at', null)

  if (memberXpGoalError && !isMissingRelationError(memberXpGoalError)) {
    return { error: new Error(memberXpGoalError.message) }
  }

  await resyncFamilyXpHistoryForDate(familyId, getLocalDateKey())

  const { error: syncGoalsError } = await supabase.rpc('sync_all_xp_goals_for_family', {
    p_family_id: familyId,
  })

  if (syncGoalsError && !isMissingRelationError(syncGoalsError)) {
    const { error: syncPersonalGoalsError } = await supabase.rpc('sync_all_personal_goals_for_family', {
      p_family_id: familyId,
    })
    if (syncPersonalGoalsError && !isMissingRelationError(syncPersonalGoalsError)) {
      return { error: new Error(syncPersonalGoalsError.message) }
    }
  }

  return { error: null }
}

export async function deleteParentById(parentId: string, familyId: string): Promise<{ error: Error | null }> {
  const adminError = await assertFamilyAdminSession(familyId)
  if (adminError.error) return adminError

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
  const adminError = await assertFamilyAdminSession(familyId)
  if (adminError.error) return adminError

  const xpError = await assertMemberHasNoDayXp({ familyId, memberKind: 'child', memberId: childId })
  if (xpError.error) return xpError

  await clearMemberXpHistory({ familyId, memberKind: 'child', memberId: childId })

  const { error } = await supabase.from('child_profiles').delete().eq('id', childId).eq('family_id', familyId)
  if (error) return { error: new Error(error.message) }

  await resyncFamilyXpHistoryToday(familyId)
  return { error: null }
}
