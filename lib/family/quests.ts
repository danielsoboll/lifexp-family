import { cetAddDays, cetToday, cetYesterday, normalizeDateKey } from '../cetDate'
import { readFamilySession } from '../familySession'
import { supabase } from '../supabase'
import { assertFamilyAdminSession } from './admin'
import { fetchQuestAssignmentsForQuests, replaceQuestAssignments } from './questAssignments'
import { assigneesForFamilyQuestXpBudget, fetchMemberXpBudget } from './questXpBudget'
import { clampQuestXp, isAllowedQuestTaskDate, isQuestFromYesterday } from './questRules'
import { aggregateQuestFulfillmentStatus, sessionIsQuestCreator } from './questConfirmation'
import type { Quest, QuestAssignee, QuestRecurrence, QuestWithCompletion, QuestAssigneeCompletion, QuestCompletionOnDate } from './types'

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

export function compareQuestsForOverview(a: Quest, b: Quest): number {
  const dateCmp = normalizeDateKey(a.task_date).localeCompare(normalizeDateKey(b.task_date))
  if (dateCmp !== 0) return dateCmp
  const titleCmp = a.title.localeCompare(b.title, 'de')
  if (titleCmp !== 0) return titleCmp
  return a.created_at.localeCompare(b.created_at)
}

/** Abgelaufene Quests (älter als Gestern) deaktivieren — nicht mehr in der App sichtbar. */
export async function deactivateExpiredQuestsForFamily(familyId: string): Promise<void> {
  const yesterday = cetYesterday()
  await supabase
    .from('quests')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('family_id', familyId)
    .eq('is_active', true)
    .lt('task_date', yesterday)
}

export async function fetchQuestsForFamily(
  familyId: string,
  options: FetchQuestsOptions = {},
): Promise<{ quests: Quest[]; error: Error | null }> {
  await deactivateExpiredQuestsForFamily(familyId)

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
  const quests = ((data ?? []) as Quest[]).slice().sort(compareQuestsForOverview)
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
        .select(
          'id, quest_id, child_id, parent_id, completed_on, assignee_confirmed_at, creator_confirmed_at, xp_awarded',
        )
        .eq('family_id', familyId)
        .in('completed_on', taskDates.length > 0 ? taskDates : [cetToday()]),
    ])

  if (assignError) return { quests: [], error: assignError }
  if (completionsError) return { quests: [], error: new Error(completionsError.message) }

  type CompletionRow = {
    id: string
    quest_id: string
    child_id: string | null
    parent_id: string | null
    completed_on: string
    assignee_confirmed_at: string | null
    creator_confirmed_at: string | null
  }

  const rows = (completions ?? []) as CompletionRow[]
  const childDoneByQuestDate = new Map<string, string[]>()
  const parentDoneByQuestDate = new Map<string, string[]>()
  const completionsByQuestDate = new Map<string, CompletionRow[]>()

  for (const row of rows) {
    const questId = row.quest_id
    const completedOn = normalizeDateKey(row.completed_on)
    const key = `${questId}:${completedOn}`
    const list = completionsByQuestDate.get(key) ?? []
    list.push(row)
    completionsByQuestDate.set(key, list)

    if (row.creator_confirmed_at) {
      if (row.child_id) {
        const childList = childDoneByQuestDate.get(key) ?? []
        childList.push(row.child_id)
        childDoneByQuestDate.set(key, childList)
      }
      if (row.parent_id) {
        const parentList = parentDoneByQuestDate.get(key) ?? []
        parentList.push(row.parent_id)
        parentDoneByQuestDate.set(key, parentList)
      }
    }
  }

  const enriched: QuestWithCompletion[] = quests.map((quest) => {
    const dateKey = normalizeDateKey(quest.task_date)
    const completionKey = `${quest.id}:${dateKey}`
    const completionChildIds = childDoneByQuestDate.get(completionKey) ?? []
    const completionParentIds = parentDoneByQuestDate.get(completionKey) ?? []
    const assignees = assignmentsByQuest.get(quest.id) ?? []
    const dateRows = completionsByQuestDate.get(completionKey) ?? []

    const completionsOnDate: QuestCompletionOnDate[] = dateRows.map((row) => ({
      id: row.id,
      childId: row.child_id,
      parentId: row.parent_id,
      assigneeConfirmedAt: row.assignee_confirmed_at,
      creatorConfirmedAt: row.creator_confirmed_at,
    }))

    const assignee = assignees[0] ?? (quest.child_id ? { type: 'child' as const, id: quest.child_id } : null)

    let assigneeCompletion: QuestAssigneeCompletion | null = null
    if (assignee) {
      const row = dateRows.find(
        (candidate) =>
          (assignee.type === 'child' && candidate.child_id === assignee.id) ||
          (assignee.type === 'parent' && candidate.parent_id === assignee.id),
      )
      if (row) {
        assigneeCompletion = {
          completionId: row.id,
          assigneeConfirmedAt: row.assignee_confirmed_at,
          creatorConfirmedAt: row.creator_confirmed_at,
        }
      }
    }

    const fulfillmentStatus = aggregateQuestFulfillmentStatus(assignees, completionsOnDate)

    return {
      ...quest,
      assignees,
      completedToday: fulfillmentStatus === 'done',
      completionChildIds,
      completionParentIds,
      assigneeCompletion,
      fulfillmentStatus,
      completionsOnDate,
    }
  })

  return { quests: enriched, error: null }
}

export type FamilyQuestBoard = {
  todayAndTomorrow: QuestWithCompletion[]
  yesterdayOpen: QuestWithCompletion[]
}

export async function fetchFamilyQuestBoard(
  familyId: string,
): Promise<{ board: FamilyQuestBoard; error: Error | null }> {
  const today = cetToday()
  const yesterday = cetYesterday()
  const tomorrow = cetAddDays(today, 1)

  const { quests, error } = await fetchQuestsWithCompletions(familyId, {
    fromTaskDate: yesterday,
    toTaskDate: tomorrow,
  })
  if (error) return { board: { todayAndTomorrow: [], yesterdayOpen: [] }, error }

  const todayAndTomorrow = quests.filter((quest) => {
    const key = normalizeDateKey(quest.task_date)
    return key >= today && key <= tomorrow
  })

  const yesterdayOpen = quests.filter(
    (quest) => isQuestFromYesterday(quest.task_date) && quest.fulfillmentStatus !== 'done',
  )

  return { board: { todayAndTomorrow, yesterdayOpen }, error: null }
}

export async function fetchTodayAndTomorrowQuests(
  familyId: string,
): Promise<{ quests: QuestWithCompletion[]; error: Error | null }> {
  const { board, error } = await fetchFamilyQuestBoard(familyId)
  return { quests: board.todayAndTomorrow, error }
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

export type UpdateQuestInput = {
  questId: string
  familyId: string
  title: string
  description?: string
  xpReward: number
  taskDate: string
  assignees: QuestAssignee[]
}

async function assertCanDeleteQuest(
  questId: string,
  familyId: string,
): Promise<{ quest: Quest | null; error: Error | null }> {
  const session = readFamilySession()
  if (!session) return { quest: null, error: new Error('Bitte zuerst anmelden.') }

  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .eq('id', questId)
    .eq('family_id', familyId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) return { quest: null, error: new Error(error.message) }
  if (!data) return { quest: null, error: new Error('Quest nicht gefunden.') }

  const quest = data as Quest
  const taskDate = normalizeDateKey(quest.task_date)
  const { data: completions, error: completionError } = await supabase
    .from('quest_completions')
    .select('assignee_confirmed_at, creator_confirmed_at')
    .eq('quest_id', questId)
    .eq('completed_on', taskDate)

  if (completionError) return { quest: null, error: new Error(completionError.message) }

  if ((completions ?? []).some((row) => row.creator_confirmed_at)) {
    return {
      quest: null,
      error: new Error('Quest ist schon bestätigt — zuerst den Abschluss zurücksetzen.'),
    }
  }

  if (sessionIsQuestCreator(quest, session)) {
    if ((completions ?? []).some((row) => row.assignee_confirmed_at)) {
      return { quest: null, error: new Error('Quest wurde schon bearbeitet — Ändern oder Löschen nicht mehr möglich.') }
    }
    return { quest, error: null }
  }

  const { error: adminError } = await assertFamilyAdminSession(familyId)
  if (adminError) return { quest: null, error: adminError }

  return { quest, error: null }
}

async function assertCreatorCanModifyQuest(
  questId: string,
  familyId: string,
): Promise<{ quest: Quest | null; error: Error | null }> {
  const session = readFamilySession()
  if (!session) return { quest: null, error: new Error('Bitte zuerst anmelden.') }

  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .eq('id', questId)
    .eq('family_id', familyId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) return { quest: null, error: new Error(error.message) }
  if (!data) return { quest: null, error: new Error('Quest nicht gefunden.') }

  const quest = data as Quest
  if (!sessionIsQuestCreator(quest, session)) {
    return { quest: null, error: new Error('Nur der Ersteller kann diese Quest ändern.') }
  }

  const taskDate = normalizeDateKey(quest.task_date)
  const { data: completions, error: completionError } = await supabase
    .from('quest_completions')
    .select('assignee_confirmed_at')
    .eq('quest_id', questId)
    .eq('completed_on', taskDate)

  if (completionError) return { quest: null, error: new Error(completionError.message) }
  if ((completions ?? []).some((row) => row.assignee_confirmed_at)) {
    return { quest: null, error: new Error('Quest wurde schon bearbeitet — Ändern oder Löschen nicht mehr möglich.') }
  }

  return { quest, error: null }
}

export async function updateQuestForAssignees(input: UpdateQuestInput): Promise<{ error: Error | null }> {
  const { quest, error: assertError } = await assertCreatorCanModifyQuest(input.questId, input.familyId)
  if (assertError || !quest) return { error: assertError ?? new Error('Quest nicht gefunden.') }

  const taskDate = normalizeDateKey(input.taskDate)
  if (!taskDate || !isAllowedQuestTaskDate(taskDate)) {
    return { error: new Error('Quests können nur für heute oder morgen eingetragen werden.') }
  }

  if (input.assignees.length === 0) {
    return { error: new Error('Bitte mindestens ein Familienmitglied auswählen.') }
  }

  if (input.assignees.length === 1) {
    const selfError = validateCreatorNotAssignee(input.assignees[0]!)
    if (selfError) return { error: selfError }
  }

  const xpReward = clampQuestXp(input.xpReward)
  const session = readFamilySession()
  const sessionMember = session ? ({ type: session.memberKind, id: session.memberId } satisfies QuestAssignee) : null
  const familyWide = input.assignees.length > 1
  const budgetAssignees = assigneesForFamilyQuestXpBudget(input.assignees, familyWide, sessionMember)

  for (const assignee of budgetAssignees) {
    const { budget, error: budgetError } = await fetchMemberXpBudget({
      familyId: input.familyId,
      memberType: assignee.type,
      memberId: assignee.id,
      taskDate,
      excludeQuestId: input.questId,
    })
    if (budgetError) return { error: budgetError }
    if (budget.remainingXp < xpReward) {
      return {
        error: new Error(
          `Maximal ${budget.maxXp} XP pro Tag — für mindestens ein Familienmitglied sind an dem Tag nur noch ${budget.remainingXp} XP frei.`,
        ),
      }
    }
  }

  const category = familyWide ? 'familie' : 'allgemein'

  const { error: updateError } = await supabase
    .from('quests')
    .update({
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      xp_reward: xpReward,
      task_date: taskDate,
      category,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.questId)
    .eq('family_id', input.familyId)

  if (updateError) return { error: new Error(updateError.message) }

  const { error: assignError } = await replaceQuestAssignments(input.questId, input.assignees)
  if (assignError) return { error: assignError }

  return { error: null }
}

export async function deleteQuest(questId: string, familyId: string): Promise<{ error: Error | null }> {
  const { error: assertError } = await assertCanDeleteQuest(questId, familyId)
  if (assertError) return { error: assertError }

  const { error } = await supabase
    .from('quests')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', questId)
    .eq('family_id', familyId)

  if (error) return { error: new Error(error.message) }
  return { error: null }
}

/** @deprecated Nutze deleteQuest */
export async function deleteQuestByCreator(questId: string, familyId: string): Promise<{ error: Error | null }> {
  return deleteQuest(questId, familyId)
}

export async function createQuestsForAssignees(
  input: Omit<CreateQuestInput, 'assignee'> & { assignees: QuestAssignee[] },
): Promise<{ error: Error | null }> {
  if (input.assignees.length === 0) {
    return { error: new Error('Bitte mindestens ein Familienmitglied auswählen.') }
  }

  if (input.assignees.length === 1) {
    const { error } = await createQuest({ ...input, assignee: input.assignees[0]! })
    return { error }
  }

  return createQuestWithMultipleAssignees(input)
}

async function createQuestWithMultipleAssignees(
  input: Omit<CreateQuestInput, 'assignee'> & { assignees: QuestAssignee[] },
): Promise<{ error: Error | null }> {
  const taskDate = normalizeDateKey(input.taskDate)
  if (!taskDate || !isAllowedQuestTaskDate(taskDate)) {
    return { error: new Error('Quests können nur für heute oder morgen eingetragen werden.') }
  }

  const session = readFamilySession()
  if (!session) return { error: new Error('Bitte zuerst anmelden.') }

  const xpReward = clampQuestXp(input.xpReward)
  const createdByParentId = session.memberKind === 'parent' ? session.memberId : null
  const createdByChildId = session.memberKind === 'child' ? session.memberId : null
  const sessionMember = { type: session.memberKind, id: session.memberId } satisfies QuestAssignee
  const budgetAssignees = assigneesForFamilyQuestXpBudget(input.assignees, true, sessionMember)

  for (const assignee of budgetAssignees) {
    const { budget, error: budgetError } = await fetchMemberXpBudget({
      familyId: input.familyId,
      memberType: assignee.type,
      memberId: assignee.id,
      taskDate,
    })
    if (budgetError) return { error: budgetError }
    if (budget.remainingXp < xpReward) {
      return {
        error: new Error(
          `Maximal ${budget.maxXp} XP pro Tag — für mindestens ein Familienmitglied sind an dem Tag nur noch ${budget.remainingXp} XP frei.`,
        ),
      }
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
      category: 'familie',
      recurrence: 'once' satisfies QuestRecurrence,
      task_date: taskDate,
      created_by: createdByParentId,
      created_by_child_id: createdByChildId,
    })
    .select('*')
    .single()

  if (error) return { error: new Error(error.message) }

  const quest = data as Quest
  const { error: assignError } = await replaceQuestAssignments(quest.id, input.assignees)
  if (assignError) {
    await supabase.from('quests').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', quest.id)
    return { error: assignError }
  }

  return { error: null }
}

export function questPrimaryAssignee(quest: QuestWithCompletion): QuestAssignee | null {
  if (quest.assignees.length > 0) return quest.assignees[0] ?? null
  if (quest.child_id) return { type: 'child', id: quest.child_id }
  return null
}

export function isQuestCompletedForAssignee(quest: QuestWithCompletion): boolean {
  return quest.fulfillmentStatus === 'done'
}

export { questAppliesToAssignee as questAppliesToMember } from './questAssignments'
