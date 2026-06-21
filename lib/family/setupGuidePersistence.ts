import { supabase } from '../supabase'
import { familyDbError } from './dbError'
import type { SetupGuideDbPatch } from './setupGuideFamily'

export async function updateFamilySetupGuide(
  familyId: string,
  patch: SetupGuideDbPatch,
): Promise<{ error: Error | null }> {
  if (Object.keys(patch).length === 0) return { error: null }

  const { error } = await supabase
    .from('families')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', familyId)

  if (error) {
    return { error: familyDbError(error.message) }
  }
  return { error: null }
}

export async function markMemberStreakIntroSeen(input: {
  memberKind: 'parent' | 'child'
  memberId: string
}): Promise<{ error: Error | null }> {
  const table = input.memberKind === 'parent' ? 'parent_profiles' : 'child_profiles'
  const { error } = await supabase
    .from(table)
    .update({ streak_intro_seen: true, updated_at: new Date().toISOString() })
    .eq('id', input.memberId)

  if (error) {
    return { error: familyDbError(error.message) }
  }
  return { error: null }
}

export async function markFamilySoloQuestHintSeen(familyId: string): Promise<{ error: Error | null }> {
  return updateFamilySetupGuide(familyId, { guide_solo_quest_seen: true })
}
