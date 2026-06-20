import { supabase } from '../supabase'
import type { QuestAssignee } from './types'

type AssignmentRow = {
  quest_id: string
  assignee_type: 'parent' | 'child'
  assignee_id: string
}

export async function fetchQuestAssignmentsForQuests(
  questIds: string[],
): Promise<{ assignmentsByQuest: Map<string, QuestAssignee[]>; error: Error | null }> {
  const map = new Map<string, QuestAssignee[]>()
  if (questIds.length === 0) return { assignmentsByQuest: map, error: null }

  const { data, error } = await supabase
    .from('quest_assignments')
    .select('quest_id, assignee_type, assignee_id')
    .in('quest_id', questIds)

  if (error) {
    if (error.message.includes('quest_assignments') || error.code === 'PGRST205') {
      return { assignmentsByQuest: map, error: null }
    }
    return { assignmentsByQuest: map, error: new Error(error.message) }
  }

  for (const row of (data ?? []) as AssignmentRow[]) {
    const list = map.get(row.quest_id) ?? []
    list.push({ type: row.assignee_type, id: row.assignee_id })
    map.set(row.quest_id, list)
  }

  return { assignmentsByQuest: map, error: null }
}

export async function replaceQuestAssignments(
  questId: string,
  assignees: QuestAssignee[],
): Promise<{ error: Error | null }> {
  const { error: deleteError } = await supabase.from('quest_assignments').delete().eq('quest_id', questId)
  if (deleteError && !deleteError.message.includes('quest_assignments')) {
    return { error: new Error(deleteError.message) }
  }

  if (assignees.length === 0) return { error: null }

  const rows = assignees.map((a) => ({
    quest_id: questId,
    assignee_type: a.type,
    assignee_id: a.id,
  }))

  const { error } = await supabase.from('quest_assignments').insert(rows)
  if (error) {
    if (error.message.includes('quest_assignments') || error.code === 'PGRST205') {
      return { error: new Error('Quest-Zuweisungen benötigen supabase/quest_assignments_migration.sql.') }
    }
    return { error: new Error(error.message) }
  }

  return { error: null }
}

export function questAppliesToAssignee(
  questChildId: string | null,
  assignees: QuestAssignee[],
  type: 'parent' | 'child',
  memberId: string,
): boolean {
  if (assignees.length > 0) {
    return assignees.some((a) => a.type === type && a.id === memberId)
  }
  if (type === 'parent') return false
  return questChildId === null || questChildId === memberId
}
