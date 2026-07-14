import type { SupabaseClient } from '@supabase/supabase-js'

import { isAdminRole } from './members'
import type { FamilyMemberRole } from './types'
import { QUEST_COMPLETION_PHOTOS_BUCKET } from './questCompletionPlus'

function isMissingRelationError(error: { message?: string; code?: string }): boolean {
  return Boolean(
    error.code === 'PGRST205' ||
      error.code === '42P01' ||
      error.message?.includes('schema cache') ||
      error.message?.includes('does not exist'),
  )
}

function isMissingRpcError(error: { message?: string; code?: string }): boolean {
  return Boolean(
    isMissingRelationError(error) ||
      error.code === 'PGRST202' ||
      error.message?.includes('Could not find the function') ||
      error.message?.includes('function public.lifexp_delete_family_cascade')
  )
}

/** RPC nur für service_role — Client fällt auf manuelle Cascade zurück. */
function isRpcUnavailableError(error: { message?: string; code?: string }): boolean {
  return Boolean(
    isMissingRpcError(error) ||
      error.code === '42501' ||
      error.code === 'PGRST301' ||
      error.message?.includes('permission denied') ||
      error.message?.includes('not authorized')
  )
}

const XP_HISTORY_TABLES = ['member_daily_xp_history', 'family_daily_xp_history'] as const

async function purgeFamilyXpHistory(
  client: SupabaseClient,
  familyId: string,
): Promise<Error | null> {
  for (const table of XP_HISTORY_TABLES) {
    const tableError = await deleteRowsByFamilyId(client, table, familyId)
    if (tableError) return tableError
  }
  return null
}

async function deleteRowsByFamilyId(
  client: SupabaseClient,
  table: string,
  familyId: string,
): Promise<Error | null> {
  const { error } = await client.from(table).delete().eq('family_id', familyId)
  if (!error) return null
  if (isMissingRelationError(error)) return null
  return new Error(`${table}: ${error.message}`)
}

async function deleteQuestCompletionStorageForFamily(client: SupabaseClient, familyId: string): Promise<void> {
  const { data: completionFolders, error: listError } = await client.storage
    .from(QUEST_COMPLETION_PHOTOS_BUCKET)
    .list(familyId)

  if (listError || !completionFolders?.length) return

  const paths: string[] = []
  for (const folder of completionFolders) {
    const prefix = `${familyId}/${folder.name}`
    const { data: files } = await client.storage.from(QUEST_COMPLETION_PHOTOS_BUCKET).list(prefix)
    for (const file of files ?? []) {
      paths.push(`${prefix}/${file.name}`)
    }
  }

  if (paths.length > 0) {
    await client.storage.from(QUEST_COMPLETION_PHOTOS_BUCKET).remove(paths)
  }
}

/** Reihenfolge wegen Foreign Keys — Kinder zuerst, Familie vor parent_profiles. */
const FAMILY_DELETE_TABLES = [
  'quest_completion_creator_reactions',
  'quest_completion_assignee_photos',
  'quest_assignments',
  'reward_redemptions',
  'member_personal_goal_tracking',
  'member_personal_goals',
  'family_personal_goal_tracking',
  'family_personal_goals',
  'member_xp_goal_daily_progress',
  'member_xp_goal_periods',
  'family_xp_goal_periods',
  'member_daily_xp_history',
  'family_daily_xp_history',
  'family_challenge_progress',
  'quest_completions',
  'daily_xp_entries',
  'recurring_quest_template_assignments',
  'recurring_quest_templates',
  'family_challenges',
  'rewards',
  'quests',
  'child_profiles',
  'family_members',
] as const

async function deleteFamilyCascadeManual(
  client: SupabaseClient,
  familyId: string,
): Promise<{ error: Error | null }> {
  const { data: memberships, error: membershipError } = await client
    .from('family_members')
    .select('parent_id')
    .eq('family_id', familyId)

  if (membershipError) {
    return { error: new Error(membershipError.message) }
  }

  const parentIds = [...new Set((memberships ?? []).map((row) => row.parent_id as string))]

  try {
    await deleteQuestCompletionStorageForFamily(client, familyId)
  } catch {
    /* Fotos optional */
  }

  for (const table of FAMILY_DELETE_TABLES) {
    const tableError = await deleteRowsByFamilyId(client, table, familyId)
    if (tableError) return { error: tableError }
  }

  // XP-Trigger können beim Löschen von quest_completions/daily_xp_entries Historie neu schreiben.
  const historyPurgeError = await purgeFamilyXpHistory(client, familyId)
  if (historyPurgeError) return { error: historyPurgeError }

  const { error: familyError } = await client.from('families').delete().eq('id', familyId)
  if (familyError) {
    const message = familyError.message.includes('foreign key')
      ? `${familyError.message} — Bitte supabase/lifexp_delete_family_cascade.sql in Supabase ausführen.`
      : familyError.message
    return { error: new Error(message) }
  }

  const { data: stillThere, error: verifyError } = await client
    .from('families')
    .select('id')
    .eq('id', familyId)
    .maybeSingle()

  if (verifyError) {
    return { error: new Error(verifyError.message) }
  }

  if (stillThere) {
    return {
      error: new Error(
        'Familie konnte nicht gelöscht werden — bitte supabase/lifexp_delete_family_cascade.sql in Supabase ausführen.',
      ),
    }
  }

  for (const parentId of parentIds) {
    const { error: parentDeleteError } = await client.from('parent_profiles').delete().eq('id', parentId)
    if (parentDeleteError) {
      return { error: new Error(parentDeleteError.message) }
    }
  }

  return { error: null }
}

export async function deleteFamilyCascadeDirect(
  client: SupabaseClient,
  familyId: string,
): Promise<{ error: Error | null }> {
  const { data: familyRow, error: familyLookupError } = await client
    .from('families')
    .select('id')
    .eq('id', familyId)
    .maybeSingle()

  if (familyLookupError) {
    return { error: new Error(familyLookupError.message) }
  }

  if (!familyRow) {
    return { error: new Error('Familie nicht gefunden — sie wurde bereits gelöscht oder existiert nicht.') }
  }

  const { data: rpcDeleted, error: rpcError } = await client.rpc('lifexp_delete_family_cascade', {
    p_family_id: familyId,
  })

  if (!rpcError) {
    if (rpcDeleted === true) {
      try {
        await deleteQuestCompletionStorageForFamily(client, familyId)
      } catch {
        /* optional */
      }
      return { error: null }
    }

    return {
      error: new Error(
        'Familie konnte nicht gelöscht werden — bitte supabase/lifexp_delete_family_cascade.sql in Supabase ausführen.',
      ),
    }
  }

  if (!isRpcUnavailableError(rpcError)) {
    return { error: new Error(rpcError.message) }
  }

  return deleteFamilyCascadeManual(client, familyId)
}

export async function assertFamilyAdminAuthorized(
  client: SupabaseClient,
  familyId: string,
  memberKind: 'parent' | 'child',
  memberId: string,
): Promise<{ error: Error | null }> {
  const { data: familyRow, error: familyError } = await client
    .from('families')
    .select('id')
    .eq('id', familyId)
    .maybeSingle()

  if (familyError) return { error: new Error(familyError.message) }
  if (!familyRow) return { error: new Error('Familie nicht gefunden.') }

  if (memberKind === 'parent') {
    const { data: membership, error: membershipError } = await client
      .from('family_members')
      .select('role')
      .eq('family_id', familyId)
      .eq('parent_id', memberId)
      .maybeSingle()

    if (membershipError) return { error: new Error(membershipError.message) }
    if (!membership) {
      return { error: new Error('Keine Berechtigung — Familienmitglied nicht gefunden.') }
    }

    const role = membership.role as FamilyMemberRole
    if (role === 'owner') {
      return { error: null }
    }

    const { data: profile, error: profileError } = await client
      .from('parent_profiles')
      .select('can_admin')
      .eq('id', memberId)
      .maybeSingle()

    if (profileError) return { error: new Error(profileError.message) }
    if (!profile?.can_admin || !isAdminRole(role)) {
      return { error: new Error('Nur Familien-Admins können diese Aktion ausführen.') }
    }

    return { error: null }
  }

  const { data: child, error: childError } = await client
    .from('child_profiles')
    .select('can_admin')
    .eq('id', memberId)
    .eq('family_id', familyId)
    .maybeSingle()

  if (childError) return { error: new Error(childError.message) }
  if (!child) {
    return { error: new Error('Keine Berechtigung — Familienmitglied nicht gefunden.') }
  }
  if (!child.can_admin) {
    return { error: new Error('Nur Familien-Admins können diese Aktion ausführen.') }
  }

  return { error: null }
}

/** @deprecated Alias — nutze assertFamilyAdminAuthorized */
export const assertFamilyDeleteAuthorized = assertFamilyAdminAuthorized
