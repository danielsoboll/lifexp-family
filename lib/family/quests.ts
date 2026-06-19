import { cetToday } from '../cetDate'
import { supabase } from '../supabase'
import type { Quest, QuestRecurrence, QuestWithCompletion } from './types'

export type CreateQuestInput = {
  familyId: string
  title: string
  description?: string
  xpReward: number
  category?: string
  recurrence?: QuestRecurrence
  childId?: string | null
}

export async function fetchQuestsForFamily(
  familyId: string,
): Promise<{ quests: Quest[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .eq('family_id', familyId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })

  if (error) return { quests: [], error: new Error(error.message) }
  return { quests: (data ?? []) as Quest[], error: null }
}

export async function fetchQuestsWithCompletions(
  familyId: string,
  entryDate = cetToday(),
): Promise<{ quests: QuestWithCompletion[]; error: Error | null }> {
  const { quests, error: questsError } = await fetchQuestsForFamily(familyId)
  if (questsError) return { quests: [], error: questsError }

  const { data: completions, error: completionsError } = await supabase
    .from('quest_completions')
    .select('quest_id, child_id')
    .eq('family_id', familyId)
    .eq('completed_on', entryDate)

  if (completionsError) return { quests: [], error: new Error(completionsError.message) }

  const byQuest = new Map<string, string[]>()
  for (const row of completions ?? []) {
    const questId = row.quest_id as string
    const childId = row.child_id as string
    const list = byQuest.get(questId) ?? []
    list.push(childId)
    byQuest.set(questId, list)
  }

  const enriched: QuestWithCompletion[] = quests.map((quest) => {
    const completionChildIds = byQuest.get(quest.id) ?? []
    return {
      ...quest,
      completedToday: completionChildIds.length > 0,
      completionChildIds,
    }
  })

  return { quests: enriched, error: null }
}

export async function createQuest(input: CreateQuestInput): Promise<{ quest: Quest | null; error: Error | null }> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id ?? null

  const { data, error } = await supabase
    .from('quests')
    .insert({
      family_id: input.familyId,
      child_id: input.childId ?? null,
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      xp_reward: Math.max(0, Math.floor(input.xpReward)),
      category: input.category?.trim() || 'allgemein',
      recurrence: input.recurrence ?? 'daily',
      created_by: userId,
    })
    .select('*')
    .single()

  if (error) return { quest: null, error: new Error(error.message) }
  return { quest: data as Quest, error: null }
}

export function questAppliesToChild(quest: Quest, childId: string): boolean {
  return quest.child_id === null || quest.child_id === childId
}
