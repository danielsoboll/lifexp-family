import type { SupabaseClient } from '@supabase/supabase-js'

import { QUEST_COMPLETION_PHOTOS_BUCKET } from './questCompletionPlus'

function isMissingRelationError(error: { message?: string; code?: string }): boolean {
  return Boolean(
    error.code === 'PGRST205' ||
      error.code === '42P01' ||
      error.message?.includes('schema cache') ||
      error.message?.includes('does not exist'),
  )
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

export async function deleteFamilyCascadeDirect(
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
    /* Fotos optional — Löschen der Familie nicht blockieren */
  }

  for (const table of FAMILY_DELETE_TABLES) {
    const tableError = await deleteRowsByFamilyId(client, table, familyId)
    if (tableError) return { error: tableError }
  }

  const { data: deleted, error: familyError } = await client
    .from('families')
    .delete()
    .eq('id', familyId)
    .select('id')

  if (familyError) {
    const message = familyError.message.includes('foreign key')
      ? `${familyError.message} — Bitte supabase/family_delete_cascade_fix.sql in Supabase ausführen.`
      : familyError.message
    return { error: new Error(message) }
  }

  if (!deleted?.length) {
    return {
      error: new Error('Familie konnte nicht gelöscht werden — keine Berechtigung oder unbekannte Familien-ID.'),
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

export async function assertFamilyDeleteAuthorized(
  client: SupabaseClient,
  familyId: string,
  memberKind: 'parent' | 'child',
  memberId: string,
): Promise<{ error: Error | null }> {
  if (memberKind === 'parent') {
    const { data, error } = await client
      .from('family_members')
      .select('role, parent_profiles(can_admin)')
      .eq('family_id', familyId)
      .eq('parent_id', memberId)
      .maybeSingle()

    if (error) return { error: new Error(error.message) }
    if (!data) return { error: new Error('Familienmitglied nicht gefunden.') }

    const profile = data.parent_profiles as { can_admin?: boolean } | null
    const isOwner = data.role === 'owner'
    if (!profile?.can_admin && !isOwner) {
      return { error: new Error('Nur Familien-Admins können die Familie löschen.') }
    }
    return { error: null }
  }

  const { data, error } = await client
    .from('child_profiles')
    .select('id, family_id, can_admin')
    .eq('id', memberId)
    .eq('family_id', familyId)
    .maybeSingle()

  if (error) return { error: new Error(error.message) }
  if (!data?.can_admin) {
    return { error: new Error('Nur Familien-Admins können die Familie löschen.') }
  }

  return { error: null }
}
