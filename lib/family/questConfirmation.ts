import type { ParentGender } from './memberGender'
import type { FamilySession } from '../familySession'
import { readFamilySession } from '../familySession'
import type { ParentMember } from './members'
import type {
  ChildWithTodayXp,
  Quest,
  QuestAssignee,
  QuestFulfillmentStatus,
  QuestWithCompletion,
  PendingCreatorConfirmation,
  QuestCompletionOnDate,
  RecurringQuestTemplate,
} from './types'

export function sessionIsQuestCreator(quest: Quest, session: FamilySession): boolean {
  if (session.memberKind === 'parent') {
    return quest.created_by === session.memberId
  }
  return quest.created_by_child_id === session.memberId
}

export function sessionIsRecurringTemplateCreator(
  template: Pick<RecurringQuestTemplate, 'created_by' | 'created_by_child_id'>,
  session: FamilySession,
): boolean {
  if (session.memberKind === 'parent') return template.created_by === session.memberId
  return template.created_by_child_id === session.memberId
}

export function fulfillmentStatusFromRow(row: {
  assignee_confirmed_at: string | null
  creator_confirmed_at: string | null
} | null): QuestFulfillmentStatus {
  if (!row?.assignee_confirmed_at) return 'open'
  if (!row.creator_confirmed_at) return 'awaiting_creator'
  return 'done'
}

export function canSessionModifyQuest(
  quest: Quest,
  session: FamilySession | null = readFamilySession(),
): boolean {
  if (!session) return false
  return sessionIsQuestCreator(quest, session)
}

/** Ersteller (offen) oder Admin (noch nicht endgültig bestätigt) darf Quest-Eintrag entfernen. */
export function canSessionDeleteQuest(
  quest: QuestWithCompletion,
  session: FamilySession | null = readFamilySession(),
  canAdmin = false,
): boolean {
  if (!session) return false
  if (quest.fulfillmentStatus === 'done') return false
  if (canAdmin) return true
  return canSessionModifyQuest(quest, session) && questIsOpenForEditing(quest)
}

export function questIsOpenForEditing(quest: Pick<QuestWithCompletion, 'fulfillmentStatus'>): boolean {
  return quest.fulfillmentStatus === 'open'
}

export function isCompletionForSessionMember(
  session: FamilySession,
  childId: string | null,
  parentId: string | null,
): boolean {
  if (session.memberKind === 'child') return childId === session.memberId
  return parentId === session.memberId
}

export function isFamilyWideQuest(quest: Pick<QuestWithCompletion, 'assignees' | 'category'>): boolean {
  return quest.assignees.length > 1 || quest.category === 'familie'
}

export function fulfillmentForMemberOnQuest(
  quest: Pick<QuestWithCompletion, 'completionsOnDate'>,
  memberType: 'parent' | 'child',
  memberId: string,
): QuestFulfillmentStatus {
  const row = quest.completionsOnDate.find((completion) =>
    memberType === 'child' ? completion.childId === memberId : completion.parentId === memberId,
  )
  return fulfillmentStatusFromRow(
    row
      ? {
          assignee_confirmed_at: row.assigneeConfirmedAt,
          creator_confirmed_at: row.creatorConfirmedAt,
        }
      : null,
  )
}

export function aggregateQuestFulfillmentStatus(
  assignees: QuestAssignee[],
  completionsOnDate: QuestCompletionOnDate[],
): QuestFulfillmentStatus {
  if (assignees.length === 0) {
    return fulfillmentStatusFromRow(
      completionsOnDate[0]
        ? {
            assignee_confirmed_at: completionsOnDate[0].assigneeConfirmedAt,
            creator_confirmed_at: completionsOnDate[0].creatorConfirmedAt,
          }
        : null,
    )
  }

  const statuses = assignees.map((assignee) =>
    fulfillmentForMemberOnQuest({ completionsOnDate }, assignee.type, assignee.id),
  )
  if (statuses.every((status) => status === 'done')) return 'done'
  if (statuses.some((status) => status === 'awaiting_creator')) return 'awaiting_creator'
  return 'open'
}

export function resolveAssigneeCompletionForQuest(
  quest: QuestWithCompletion,
): QuestWithCompletion['assigneeCompletion'] {
  return quest.assigneeCompletion
}

export function isQuestFullyDone(quest: QuestWithCompletion): boolean {
  return quest.fulfillmentStatus === 'done'
}

export function isQuestAwaitingCreator(quest: QuestWithCompletion): boolean {
  return quest.fulfillmentStatus === 'awaiting_creator'
}

export function canSessionConfirmQuestCompletion(input: {
  quest: Quest
  session: FamilySession | null
  assigneeChildId: string | null
  assigneeParentId: string | null
  canAdmin: boolean
}): boolean {
  const session = input.session ?? readFamilySession()
  if (!session) return false
  if (isCompletionForSessionMember(session, input.assigneeChildId, input.assigneeParentId)) {
    return false
  }
  if (sessionIsQuestCreator(input.quest, session)) return true
  return input.canAdmin
}

export function pendingConfirmableCompletions(
  quest: QuestWithCompletion,
  session: FamilySession | null,
  canAdmin: boolean,
): QuestCompletionOnDate[] {
  if (!session) return []
  return quest.completionsOnDate.filter(
    (row) =>
      row.assigneeConfirmedAt &&
      !row.creatorConfirmedAt &&
      canSessionConfirmQuestCompletion({
        quest,
        session,
        assigneeChildId: row.childId,
        assigneeParentId: row.parentId,
        canAdmin,
      }),
  )
}

export type QuestConfirmationPerspective = 'assignee_waiting' | 'confirmer_action'

/** Nur für Beteiligte: Wartender oder Bestätiger — sonst null. */
export function questConfirmationPerspectiveForSessionOnQuest(
  quest: QuestWithCompletion,
  session: FamilySession | null,
  canAdmin: boolean,
): QuestConfirmationPerspective | null {
  if (!session) return null

  const selfStatus = fulfillmentForMemberOnQuest(quest, session.memberKind, session.memberId)
  if (selfStatus === 'awaiting_creator') return 'assignee_waiting'

  if (pendingConfirmableCompletions(quest, session, canAdmin).length > 0) {
    return 'confirmer_action'
  }

  return null
}

/** Perspektive für Quest in einer Mitglieder-Gruppe (Assignee der Gruppe). */
export function questConfirmationPerspectiveForMemberOnQuest(input: {
  quest: QuestWithCompletion
  memberType: 'parent' | 'child'
  memberId: string
  session: FamilySession | null
  canAdmin: boolean
}): QuestConfirmationPerspective | null {
  const memberStatus = fulfillmentForMemberOnQuest(input.quest, input.memberType, input.memberId)
  if (memberStatus !== 'awaiting_creator') return null

  if (
    input.session &&
    input.session.memberKind === input.memberType &&
    input.session.memberId === input.memberId
  ) {
    return 'assignee_waiting'
  }

  const completion = input.quest.completionsOnDate.find((row) =>
    input.memberType === 'child' ? row.childId === input.memberId : row.parentId === input.memberId,
  )
  if (
    completion &&
    input.session &&
    canSessionConfirmQuestCompletion({
      quest: input.quest,
      session: input.session,
      assigneeChildId: completion.childId,
      assigneeParentId: completion.parentId,
      canAdmin: input.canAdmin,
    })
  ) {
    return 'confirmer_action'
  }

  return null
}

export function canSessionConfirmAsCreator(quest: Quest, canAdmin = false): boolean {
  const session = readFamilySession()
  if (!session) return false
  if (sessionIsQuestCreator(quest, session)) return true
  return canAdmin
}

export function assigneeDisplayNameFromCompletion(
  childId: string | null,
  parentId: string | null,
  parents: ReadonlyArray<ParentMember>,
  children: ReadonlyArray<Pick<ChildWithTodayXp, 'id' | 'display_name'>>,
  formatParent: (name: string, gender: ParentGender) => string,
): string {
  if (childId) {
    return children.find((c) => c.id === childId)?.display_name ?? 'Kind'
  }
  if (parentId) {
    const parent = parents.find((p) => p.id === parentId)
    return parent ? formatParent(parent.display_name, parent.gender) : 'Erwachsene'
  }
  return 'Familienmitglied'
}

export type { PendingCreatorConfirmation, QuestAssignee }
