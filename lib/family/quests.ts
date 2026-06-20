import { cetAddDays, cetToday, normalizeDateKey } from '../cetDate'
import { readFamilySession } from '../familySession'
import { supabase } from '../supabase'
import { fetchQuestAssignmentsForQuests, replaceQuestAssignments } from './questAssignments'
import { fetchMemberXpBudget } from './questXpBudget'
import { clampQuestXp, isAllowedQuestTaskDate } from './questRules'
import type { Quest, QuestAssignee, QuestRecurrence, QuestWithCompletion } from './types'

export type CreateQuestInput = {
  familyId: string
  title: string
  description?: string
  xpReward: number
  taskDate: string
  assignee: QuestAssignee
}

export type FetchQuestsOptions = {
  /** Nur Quests ab diesem Kalendertag (inkl.). */
  fromTaskDate?: string
  /** Nur Quests bis zu diesem Kalendertag (inkl.). */
  toTaskDate?: string
}

function sortQuestsForOverview(a: Quest, b: Quest): number {
  const dateCmp = normalizeDateKey(a.task_date).localeCompare(normalizeDateKey(b.task_date))
  if (dateCmp !== 0) return dateCmp
  const titleCmp = a.title.localeCompare(b.title, 'de')
  if (titleCmp !== 0) return titleCmp
  return a.created_at.localeCompare(b.created_at)
}

export async function fetchQuestsForFamily(
  familyId: string,
  options: FetchQuestsOptions = {},
): Promise<{ quests: Quest[]; error: Error | null }> {
  let query = supabase
    .from('quests')
    .select('*')
    .eq('family_id', familyId)
    .eq('is_active', true)

  if (options.fromTaskDate) {
    query = query.gte('task_date', normalizeDateKey(options.fromTaskDate))
  }
  if (options.toTaskDate) {
    query = query.lte('task_date', normalizeDateKey(options.toTaskDate))
  }

  const { data, error } = await query.order('task_date', { ascending: true }).order('created_at', { ascending: true })

  if (error) return { quests: [], error: new Error(error.message) }
  const quests = ((data ?? []) as Quest[]).slice().sort(sortQuestsForOverview)
  return { quests, error: null }
}

export async function fetchQuestsWithCompletions(
  familyId: string,
  options: FetchQuestsOptions = {},
): Promise<{ quests: QuestWithCompletion[]; error: Error | null }> {
  const { quests, error: questsError } = await fetchQuestsForFamily(familyId, options)
  if (questsError) return { quests: [], error: questsError }
  if (quests.length === 0) return { quests: [], error: null }

  const questIds = quests.map((q) => q.id)
  const taskDates = [...new Set(quests.map((q) => normalizeDateKey(q.task_date)).filter(Boolean))]

  const [{ assignmentsByQuest, error: assignError }, { data: completions, error: completionsError }] =
    await Promise.all([
      fetchQuestAssignmentsForQuests(questIds),
      supabase
        .from('quest_completions')
        .select('quest_id, child_id, parent_id, completed_on')
        .eq('family_id', familyId)
        .in('completed_on', taskDates.length > 0 ? taskDates : [cetToday()]),
    ])

  if (assignError) return { quests: [], error: assignError }
  if (completionsError) return { quests: [], error: new Error(completionsError.message) }

  const childByQuestDate = new Map<string, string[]>()
  const parentByQuestDate = new Map<string, string[]>()

  for (const row of completions ?? []) {
    const questId = row.quest_id as string
    const completedOn = normalizeDateKey(row.completed_on as string)
    const childId = row.child_id as string | null
    const parentId = row.parent_id as string | null
    const key = `${questId}:${completedOn}`
    if (childId) {
      const list = childByQuestDate.get(key) ?? []
      list.push(childId)
      childByQuestDate.set(key, list)
    }
    if (parentId) {
      const list = parentByQuestDate.get(key) ?? []
      list.push(parentId)
      parentByQuestDate.set(key, list)
    }
  }

  const enriched: QuestWithCompletion[] = quests.map((quest) => {
    const dateKey = normalizeDateKey(quest.task_date)
    const completionKey = `${quest.id}:${dateKey}`
    const completionChildIds = childByQuestDate.get(completionKey) ?? []
    const completionParentIds = parentByQuestDate.get(completionKey) ?? []
    const assignees = assignmentsByQuest.get(quest.id) ?? []
    return {
      ...quest,
      assignees,
      completedToday: completionChildIds.length > 0 || completionParentIds.length > 0,
      completionChildIds,
      completionParentIds,
    }
  })

  return { quests: enriched, error: null }
}

export async function fetchTodayAndTomorrowQuests(
  familyId: string,
): Promise<{ quests: QuestWithCompletion[]; error: Error | null }> {
  const today = cetToday()
  const tomorrow = cetAddDays(today, 1)
  return fetchQuestsWithCompletions(familyId, { fromTaskDate: today, toTaskDate: tomorrow })
}

function validateCreatorNotAssignee(
  assignee: QuestAssignee,
  session = readFamilySession(),
): Error | null {
  if (!session) return new Error('Bitte zuerst anmelden.')
  if (session.memberKind === assignee.type && session.memberId === assignee.id) {
    return new Error('Du kannst dir keine Quest eintragen — nur für andere Familienmitglieder.')
  }
  return null
}

export async function createQuest(input: CreateQuestInput): Promise<{ quest: Quest | null; error: Error | null }> {
  const taskDate = normalizeDateKey(input.taskDate)
  if (!taskDate || !isAllowedQuestTaskDate(taskDate)) {
    return { quest: null, error: new Error('Quests können nur für heute oder morgen eingetragen werden.') }
  }

  const selfError = validateCreatorNotAssignee(input.assignee)
  if (selfError) return { quest: null, error: selfError }

  const session = readFamilySession()
  if (!session) return { quest: null, error: new Error('Bitte zuerst anmelden.') }

  const xpReward = clampQuestXp(input.xpReward)
  const createdByParentId = session.memberKind === 'parent' ? session.memberId : null
  const createdByChildId = session.memberKind === 'child' ? session.memberId : null

  const { budget, error: budgetError } = await fetchMemberXpBudget({
    familyId: input.familyId,
    memberType: input.assignee.type,
    memberId: input.assignee.id,
    taskDate,
  })
  if (budgetError) return { quest: null, error: budgetError }
  if (budget.remainingXp < xpReward) {
    return {
      quest: null,
      error: new Error(
        `Maximal ${budget.maxXp} XP pro Tag — für dieses Mitglied sind an dem Tag nur noch ${budget.remainingXp} XP frei.`,
      ),
    }
  }

  const { data, error } = await supabase
    .from('quests')
    .insert({
      family_id: input.familyId,
      child_id: null,
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      xp_reward: xpReward,
      category: 'allgemein',
      recurrence: 'once' satisfies QuestRecurrence,
      task_date: taskDate,
      created_by: createdByParentId,
      created_by_child_id: createdByChildId,
    })
    .select('*')
    .single()

  if (error) return { quest: null, error: new Error(error.message) }

  const quest = data as Quest
  const { error: assignError } = await replaceQuestAssignments(quest.id, [input.assignee])
  if (assignError) return { quest, error: assignError }

  return { quest, error: null }
}

export function questPrimaryAssignee(quest: QuestWithCompletion): QuestAssignee | null {
  if (quest.assignees.length > 0) return quest.assignees[0] ?? null
  if (quest.child_id) return { type: 'child', id: quest.child_id }
  return null
}

export function isQuestCompletedForAssignee(quest: QuestWithCompletion): boolean {
  const assignee = questPrimaryAssignee(quest)
  if (!assignee) return false
  return assignee.type === 'parent'
    ? quest.completionParentIds.includes(assignee.id)
    : quest.completionChildIds.includes(assignee.id)
}

export { questAppliesToAssignee as questAppliesToMember } from './questAssignments'
