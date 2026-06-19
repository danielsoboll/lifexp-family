import { cetToday } from '../cetDate'
import { supabase } from '../supabase'
import type { Quest } from './types'
import { recordDailyXpEntry } from './xp'

export async function completeQuestForChild(input: {
  quest: Quest
  childId: string
  familyId: string
  entryDate?: string
}): Promise<{ error: Error | null }> {
  const entryDate = input.entryDate ?? cetToday()
  const xpAwarded = Math.max(0, Math.floor(input.quest.xp_reward))

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id ?? null

  const { data: completion, error: completionError } = await supabase
    .from('quest_completions')
    .insert({
      quest_id: input.quest.id,
      child_id: input.childId,
      family_id: input.familyId,
      completed_on: entryDate,
      xp_awarded: xpAwarded,
      completed_by: userId,
    })
    .select('id')
    .single()

  if (completionError) {
    if (completionError.code === '23505') {
      return { error: new Error('Diese Quest wurde heute für dieses Kind schon erledigt.') }
    }
    return { error: new Error(completionError.message) }
  }

  const xpError = await recordDailyXpEntry({
    familyId: input.familyId,
    childId: input.childId,
    entryDate,
    source: 'quest',
    sourceId: input.quest.id,
    xpAmount: xpAwarded,
    metadata: { quest_completion_id: completion.id, quest_title: input.quest.title },
  })

  return { error: xpError }
}

export async function fetchCompletionsForChildOnDate(
  childId: string,
  entryDate: string,
): Promise<{ questIds: string[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('quest_completions')
    .select('quest_id')
    .eq('child_id', childId)
    .eq('completed_on', entryDate)

  if (error) return { questIds: [], error: new Error(error.message) }
  return { questIds: (data ?? []).map((row) => row.quest_id as string), error: null }
}
