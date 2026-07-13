import { getLocalDateKey } from '../cetDate'
import { getStoredFamilyId, readFamilySession } from '../familySession'
import { supabase } from '../supabase'
import { sessionHasAdminAccess } from './memberAdmin'
import { MEMBER_HAS_XP_ERROR, memberHasCollectedDayXp } from './memberRemovable'
import { isAdminRole } from './members'
import type { FamilyMemberRole } from './types'

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
    const { data, error } = await supabase
      .from('family_members')
      .select('role')
      .eq('family_id', familyId)
      .eq('parent_id', session.memberId)
      .maybeSingle()

    if (error) return { error: new Error(error.message) }
    if (!data) return { error: new Error('Familienmitglied nicht gefunden.') }

    const role = data.role as FamilyMemberRole
    if (role === 'owner') return { error: null }

    const { data: profile, error: profileError } = await supabase
      .from('parent_profiles')
      .select('can_admin')
      .eq('id', session.memberId)
      .maybeSingle()

    if (profileError) return { error: new Error(profileError.message) }
    if (!sessionHasAdminAccess('parent', profile?.can_admin ?? false, isAdminRole(role))) {
      return { error: new Error('Nur Familien-Admins können diese Aktion ausführen.') }
    }
    return { error: null }
  }

  const { data, error } = await supabase
    .from('child_profiles')
    .select('can_admin')
    .eq('id', session.memberId)
    .eq('family_id', familyId)
    .maybeSingle()

  if (error) return { error: new Error(error.message) }
  if (!data) return { error: new Error('Familienmitglied nicht gefunden.') }
  if (!sessionHasAdminAccess('child', data.can_admin)) {
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

export async function deleteFamilyById(familyId: string): Promise<{ error: Error | null }> {
  const sessionError = await assertValidFamilySession(familyId)
  if (sessionError.error) return sessionError

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

    let payload: { error?: string } = {}
    try {
      payload = (await response.json()) as { error?: string }
    } catch {
      payload = {}
    }

    if (response.ok) {
      return { error: null }
    }

    return {
      error: new Error(
        payload.error ??
          (response.status === 503
            ? 'SUPABASE_SERVICE_ROLE_KEY fehlt in Vercel — Familie kann nicht gelöscht werden.'
            : 'Familie konnte nicht gelöscht werden.'),
      ),
    }
  } catch (networkError) {
    return {
      error: new Error(
        networkError instanceof Error
          ? networkError.message
          : 'Netzwerkfehler — Familie konnte nicht gelöscht werden.',
      ),
    }
  }
}

export async function resetFamilyProgressById(familyId: string): Promise<{ error: Error | null }> {
  const sessionError = await assertValidFamilySession(familyId)
  if (sessionError.error) return sessionError

  const session = readFamilySession()
  if (!session) {
    return { error: new Error('Keine gültige Familien-Session.') }
  }

  try {
    const response = await fetch('/api/family/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        familyId,
        memberId: session.memberId,
        memberKind: session.memberKind,
      }),
    })

    let payload: { error?: string } = {}
    try {
      payload = (await response.json()) as { error?: string }
    } catch {
      payload = {}
    }

    if (response.ok) {
      return { error: null }
    }

    return {
      error: new Error(
        payload.error ??
          (response.status === 503
            ? 'SUPABASE_SERVICE_ROLE_KEY fehlt in Vercel — Familie kann nicht zurückgesetzt werden.'
            : 'Familie konnte nicht zurückgesetzt werden.'),
      ),
    }
  } catch (networkError) {
    return {
      error: new Error(
        networkError instanceof Error
          ? networkError.message
          : 'Netzwerkfehler — Familie konnte nicht zurückgesetzt werden.',
      ),
    }
  }
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
