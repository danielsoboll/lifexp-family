import { cetToday, normalizeDateKey } from '../cetDate'
import { getStoredParentId } from '../familySession'
import { supabase } from '../supabase'
import { fetchMemberXpBudget } from './questXpBudget'
import { clampQuestXp } from './questRules'
import type { Quest } from './types'
import { recordDailyXpEntry } from './xp'

async function validateCompletionBudget(input: {
  familyId: string
  memberType: 'parent' | 'child'
  memberId: string
  quest: Quest
  xpAwarded: number
}): Promise<Error | null> {
  const taskDate = normalizeDateKey(input.quest.task_date)
  if (!taskDate) return new Error('Quest ohne gültiges Datum.')

  const today = cetToday()
  if (taskDate > today) {
    return new Error('Diese Quest kann erst am geplanten Tag erledigt werden.')
  }

  const { budget, error } = await fetchMemberXpBudget({
    familyId: input.familyId,
    memberType: input.memberType,
    memberId: input.memberId,
    taskDate,
    excludeQuestId: input.quest.id,
  })
  if (error) return error
  if (budget.remainingXp < input.xpAwarded) {
    return new Error(`Tageslimit erreicht — maximal ${budget.maxXp} XP pro Tag.`)
  }
  return null
}

export async function completeQuestForChild(input: {
  quest: Quest
  childId: string
  familyId: string
  entryDate?: string
}): Promise<{ error: Error | null }> {
  const entryDate = normalizeDateKey(input.entryDate ?? input.quest.task_date)
  const xpAwarded = clampQuestXp(input.quest.xp_reward)

  const budgetError = await validateCompletionBudget({
    familyId: input.familyId,
    memberType: 'child',
    memberId: input.childId,
    quest: input.quest,
    xpAwarded,
  })
  if (budgetError) return { error: budgetError }

  const parentId = getStoredParentId()

  const { data: completion, error: completionError } = await supabase
    .from('quest_completions')
    .insert({
      quest_id: input.quest.id,
      child_id: input.childId,
      family_id: input.familyId,
      completed_on: entryDate,
      xp_awarded: xpAwarded,
      completed_by: parentId,
    })
    .select('id')
    .single()

  if (completionError) {
    if (completionError.code === '23505') {
      return { error: new Error('Diese Quest wurde an diesem Tag schon erledigt.') }
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

export async function completeQuestForParent(input: {
  quest: Quest
  parentId: string
  familyId: string
  entryDate?: string
}): Promise<{ error: Error | null }> {
  const entryDate = normalizeDateKey(input.entryDate ?? input.quest.task_date)
  const xpAwarded = clampQuestXp(input.quest.xp_reward)
  const completedBy = getStoredParentId()

  const budgetError = await validateCompletionBudget({
    familyId: input.familyId,
    memberType: 'parent',
    memberId: input.parentId,
    quest: input.quest,
    xpAwarded,
  })
  if (budgetError) return { error: budgetError }

  const { error: completionError } = await supabase.from('quest_completions').insert({
    quest_id: input.quest.id,
    parent_id: input.parentId,
    family_id: input.familyId,
    completed_on: entryDate,
    xp_awarded: xpAwarded,
    completed_by: completedBy,
  })

  if (completionError) {
    if (completionError.code === '23505') {
      return { error: new Error('Diese Quest wurde an diesem Tag schon erledigt.') }
    }
    return { error: new Error(completionError.message) }
  }

  return { error: null }
}

export async function fetchFamilyHistory(
  familyId: string,
  limit = 40,
): Promise<{
  entries: Array<{
    id: string
    kind: 'quest' | 'xp'
    title: string
    subtitle: string
    date: string
    xp: number
    memberKind: 'parent' | 'child' | null
    memberId: string | null
  }>
  error: Error | null
}> {
  const [{ data: completions, error: cErr }, { data: xpRows, error: xErr }] = await Promise.all([
    supabase
      .from('quest_completions')
      .select('id, completed_on, xp_awarded, quest_id, child_id, parent_id, quests(title)')
      .eq('family_id', familyId)
      .order('completed_on', { ascending: false })
      .limit(limit),
    supabase
      .from('daily_xp_entries')
      .select('id, entry_date, xp_amount, source, child_id')
      .eq('family_id', familyId)
      .order('entry_date', { ascending: false })
      .limit(limit),
  ])

  if (cErr) return { entries: [], error: new Error(cErr.message) }
  if (xErr) return { entries: [], error: new Error(xErr.message) }

  const entries: Array<{
    id: string
    kind: 'quest' | 'xp'
    title: string
    subtitle: string
    date: string
    xp: number
    memberKind: 'parent' | 'child' | null
    memberId: string | null
  }> = []

  for (const row of completions ?? []) {
    const questTitle = (row.quests as { title?: string } | null)?.title ?? 'Quest'
    const childId = row.child_id as string | null
    const parentId = row.parent_id as string | null
    entries.push({
      id: `q-${row.id as string}`,
      kind: 'quest',
      title: questTitle,
      subtitle: childId ? 'Quest (Kind)' : 'Quest (Elternteil)',
      date: row.completed_on as string,
      xp: row.xp_awarded as number,
      memberKind: childId ? 'child' : parentId ? 'parent' : null,
      memberId: childId ?? parentId,
    })
  }

  for (const row of xpRows ?? []) {
    entries.push({
      id: `x-${row.id as string}`,
      kind: 'xp',
      title: `XP (${row.source as string})`,
      subtitle: 'Tages-XP',
      date: row.entry_date as string,
      xp: row.xp_amount as number,
      memberKind: 'child',
      memberId: row.child_id as string,
    })
  }

  entries.sort((a, b) => b.date.localeCompare(a.date))
  return { entries: entries.slice(0, limit), error: null }
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
