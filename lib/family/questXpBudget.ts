import { normalizeDateKey } from '../cetDate'
import { supabase } from '../supabase'
import { fetchQuestAssignmentsForQuests } from './questAssignments'
import { MEMBER_DAILY_XP_MAX } from './dailyXpDisplay'
import { questAppliesToAssignee } from './questAssignments'
import type { Quest, QuestAssignee } from './types'
import { fetchTodayXpByChild, fetchTodayXpByParent } from './xp'

export type MemberXpBudget = {
  earnedXp: number
  scheduledXp: number
  remainingXp: number
  maxXp: number
}

async function fetchCompletionsOnDate(
  familyId: string,
  taskDate: string,
): Promise<{ byQuestChild: Map<string, Set<string>>; byQuestParent: Map<string, Set<string>>; error: Error | null }> {
  const { data, error } = await supabase
    .from('quest_completions')
    .select('quest_id, child_id, parent_id, creator_confirmed_at')
    .eq('family_id', familyId)
    .eq('completed_on', taskDate)

  if (error) {
    return { byQuestChild: new Map(), byQuestParent: new Map(), error: new Error(error.message) }
  }

  const byQuestChild = new Map<string, Set<string>>()
  const byQuestParent = new Map<string, Set<string>>()
  for (const row of data ?? []) {
    if (!row.creator_confirmed_at) continue
    const questId = row.quest_id as string
    const childId = row.child_id as string | null
    const parentId = row.parent_id as string | null
    if (childId) {
      const set = byQuestChild.get(questId) ?? new Set()
      set.add(childId)
      byQuestChild.set(questId, set)
    }
    if (parentId) {
      const set = byQuestParent.get(questId) ?? new Set()
      set.add(parentId)
      byQuestParent.set(questId, set)
    }
  }
  return { byQuestChild, byQuestParent, error: null }
}

function sumScheduledXpForMember(
  quests: Quest[],
  assignmentsByQuest: Map<string, QuestAssignee[]>,
  completedChild: Map<string, Set<string>>,
  completedParent: Map<string, Set<string>>,
  memberType: 'parent' | 'child',
  memberId: string,
  taskDate: string,
  excludeQuestId?: string,
): number {
  let total = 0
  for (const quest of quests) {
    if (excludeQuestId && quest.id === excludeQuestId) continue
    if (normalizeDateKey(quest.task_date) !== normalizeDateKey(taskDate)) continue

    const assignees = assignmentsByQuest.get(quest.id) ?? []
    if (!questAppliesToAssignee(quest.child_id, assignees, memberType, memberId)) continue

    const done =
      memberType === 'parent'
        ? (completedParent.get(quest.id)?.has(memberId) ?? false)
        : (completedChild.get(quest.id)?.has(memberId) ?? false)
    if (done) continue

    total += Math.max(0, Math.floor(quest.xp_reward))
  }
  return total
}

export async function fetchMemberXpBudget(input: {
  familyId: string
  memberType: 'parent' | 'child'
  memberId: string
  taskDate: string
  excludeQuestId?: string
}): Promise<{ budget: MemberXpBudget; error: Error | null }> {
  const taskDate = normalizeDateKey(input.taskDate)
  if (!taskDate) {
    return {
      budget: { earnedXp: 0, scheduledXp: 0, remainingXp: MEMBER_DAILY_XP_MAX, maxXp: MEMBER_DAILY_XP_MAX },
      error: new Error('Ungültiges Datum.'),
    }
  }

  const [{ data: questRows, error: questError }, earnedResult, completionMaps] = await Promise.all([
    supabase
      .from('quests')
      .select('id, child_id, xp_reward, task_date')
      .eq('family_id', input.familyId)
      .eq('is_active', true)
      .eq('task_date', taskDate),
    input.memberType === 'parent'
      ? fetchTodayXpByParent(input.familyId, taskDate)
      : fetchTodayXpByChild(input.familyId, taskDate),
    fetchCompletionsOnDate(input.familyId, taskDate),
  ])

  if (questError) return { budget: emptyBudget(), error: new Error(questError.message) }
  if (earnedResult.error) return { budget: emptyBudget(), error: earnedResult.error }
  if (completionMaps.error) return { budget: emptyBudget(), error: completionMaps.error }

  const quests = (questRows ?? []) as Quest[]
  const questIds = quests.map((q) => q.id)
  const { assignmentsByQuest, error: assignError } = await fetchQuestAssignmentsForQuests(questIds)
  if (assignError) return { budget: emptyBudget(), error: assignError }

  const earnedXp =
    input.memberType === 'parent'
      ? (earnedResult.totals[input.memberId] ?? 0)
      : (earnedResult.totals[input.memberId] ?? 0)

  const scheduledXp = sumScheduledXpForMember(
    quests,
    assignmentsByQuest,
    completionMaps.byQuestChild,
    completionMaps.byQuestParent,
    input.memberType,
    input.memberId,
    taskDate,
    input.excludeQuestId,
  )

  const remainingXp = Math.max(0, MEMBER_DAILY_XP_MAX - earnedXp - scheduledXp)

  return {
    budget: {
      earnedXp,
      scheduledXp,
      remainingXp,
      maxXp: MEMBER_DAILY_XP_MAX,
    },
    error: null,
  }
}

function emptyBudget(): MemberXpBudget {
  return { earnedXp: 0, scheduledXp: 0, remainingXp: MEMBER_DAILY_XP_MAX, maxXp: MEMBER_DAILY_XP_MAX }
}

/** Bei Familien-Quests zählt das Tages-XP-Limit des Erstellers nicht für Button/Validierung. */
export function assigneesForFamilyQuestXpBudget(
  assignees: QuestAssignee[],
  familyWide: boolean,
  sessionMember: QuestAssignee | null | undefined,
): QuestAssignee[] {
  if (!familyWide || !sessionMember || assignees.length <= 1) return assignees
  const filtered = assignees.filter(
    (assignee) => !(assignee.type === sessionMember.type && assignee.id === sessionMember.id),
  )
  return filtered.length > 0 ? filtered : assignees
}
