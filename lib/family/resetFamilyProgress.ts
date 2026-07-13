import type { SupabaseClient } from '@supabase/supabase-js'

import { getLocalDateKey } from '../cetDate'
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

/** XP, Verlauf und Fortschritt zurücksetzen — Familie, Mitglieder und Quests bleiben erhalten. */
export async function resetFamilyProgressDirect(
  client: SupabaseClient,
  familyId: string,
): Promise<{ error: Error | null }> {
  try {
    await deleteQuestCompletionStorageForFamily(client, familyId)
  } catch {
    /* Fotos optional */
  }

  for (const table of FAMILY_PROGRESS_RESET_TABLES) {
    const tableError = await deleteRowsByFamilyId(client, table, familyId)
    if (tableError) return { error: tableError }
  }

  const now = new Date().toISOString()

  const { error: childXpError } = await client
    .from('child_profiles')
    .update({ total_xp: 0, updated_at: now })
    .eq('family_id', familyId)

  if (childXpError && !isMissingRelationError(childXpError)) {
    return { error: new Error(childXpError.message) }
  }

  const goalProgressReset = { progress_xp: 0, completed_at: null, updated_at: now }

  const { error: memberGoalsError } = await client
    .from('member_personal_goals')
    .update(goalProgressReset)
    .eq('family_id', familyId)

  if (memberGoalsError && !isMissingRelationError(memberGoalsError)) {
    return { error: new Error(memberGoalsError.message) }
  }

  const { error: familyGoalsError } = await client
    .from('family_personal_goals')
    .update(goalProgressReset)
    .eq('family_id', familyId)

  if (familyGoalsError && !isMissingRelationError(familyGoalsError)) {
    return { error: new Error(familyGoalsError.message) }
  }

  const { error: familyXpGoalError } = await client
    .from('family_xp_goal_periods')
    .update({ progress_xp: 0, updated_at: now })
    .eq('family_id', familyId)
    .is('ended_at', null)

  if (familyXpGoalError && !isMissingRelationError(familyXpGoalError)) {
    return { error: new Error(familyXpGoalError.message) }
  }

  const { error: memberXpGoalError } = await client
    .from('member_xp_goal_periods')
    .update({ progress_xp: 0, updated_at: now })
    .eq('family_id', familyId)
    .is('ended_at', null)

  if (memberXpGoalError && !isMissingRelationError(memberXpGoalError)) {
    return { error: new Error(memberXpGoalError.message) }
  }

  const { error: syncHistoryError } = await client.rpc('sync_family_xp_history', {
    p_family_id: familyId,
    p_score_date: getLocalDateKey(),
  })

  if (syncHistoryError && !isMissingRelationError(syncHistoryError)) {
    return { error: new Error(syncHistoryError.message) }
  }

  const { error: syncGoalsError } = await client.rpc('sync_all_xp_goals_for_family', {
    p_family_id: familyId,
  })

  if (syncGoalsError && !isMissingRelationError(syncGoalsError)) {
    const { error: syncPersonalGoalsError } = await client.rpc('sync_all_personal_goals_for_family', {
      p_family_id: familyId,
    })
    if (syncPersonalGoalsError && !isMissingRelationError(syncPersonalGoalsError)) {
      return { error: new Error(syncPersonalGoalsError.message) }
    }
  }

  return { error: null }
}
