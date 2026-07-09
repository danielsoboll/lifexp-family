import type { FamilySession } from '../familySession'
import {
  assigneeDisplayNameFromCompletion,
  canSessionConfirmQuestCompletion,
} from './questConfirmation'
import { compareQuestsForOverview } from './quests'
import { formatQuestDayLabel } from './questRules'
import { formatParentDisplayName } from './familyDisplayName'
import type { ParentMember } from './members'
import type { ChildWithTodayXp, QuestCompletionOnDate, QuestWithCompletion } from './types'
import type { ChildProfile } from './types'

export type QuestAwaitingConfirmationItem = {
  quest: QuestWithCompletion
  completion: QuestCompletionOnDate
  assigneeName: string
  dayLabel: string
  canConfirm: boolean
}

export function collectQuestsAwaitingConfirmation(input: {
  quests: QuestWithCompletion[]
  session: FamilySession | null
  canAdmin: boolean
  parents: ParentMember[]
  children: ReadonlyArray<ChildProfile | ChildWithTodayXp>
}): QuestAwaitingConfirmationItem[] {
  const items: QuestAwaitingConfirmationItem[] = []

  for (const quest of [...input.quests].sort(compareQuestsForOverview)) {
    for (const completion of quest.completionsOnDate) {
      if (!completion.assigneeConfirmedAt || completion.creatorConfirmedAt) continue

      items.push({
        quest,
        completion,
        assigneeName: assigneeDisplayNameFromCompletion(
          completion.childId,
          completion.parentId,
          input.parents,
          input.children,
          formatParentDisplayName,
        ),
        dayLabel: formatQuestDayLabel(quest.task_date),
        canConfirm: canSessionConfirmQuestCompletion({
          quest,
          session: input.session,
          assigneeChildId: completion.childId,
          assigneeParentId: completion.parentId,
          canAdmin: input.canAdmin,
        }),
      })
    }
  }

  return items
}

export function collectActionableQuestConfirmations(input: {
  quests: QuestWithCompletion[]
  session: FamilySession | null
  canAdmin: boolean
  parents: ParentMember[]
  children: ReadonlyArray<ChildProfile | ChildWithTodayXp>
}): QuestAwaitingConfirmationItem[] {
  return collectQuestsAwaitingConfirmation(input).filter((item) => item.canConfirm)
}

export function countQuestsAwaitingConfirmation(
  quests: QuestWithCompletion[],
  session: FamilySession | null,
  canAdmin: boolean,
): number {
  let count = 0
  for (const quest of quests) {
    for (const completion of quest.completionsOnDate) {
      if (!completion.assigneeConfirmedAt || completion.creatorConfirmedAt) continue
      if (
        canSessionConfirmQuestCompletion({
          quest,
          session,
          assigneeChildId: completion.childId,
          assigneeParentId: completion.parentId,
          canAdmin,
        })
      ) {
        count += 1
      }
    }
  }
  return count
}

/** Alle Meldungen die noch auf Familien-OK warten (auch für Nicht-Admins sichtbar). */
export function countAllQuestsAwaitingFamilyConfirmation(quests: QuestWithCompletion[]): number {
  let count = 0
  for (const quest of quests) {
    for (const completion of quest.completionsOnDate) {
      if (completion.assigneeConfirmedAt && !completion.creatorConfirmedAt) count += 1
    }
  }
  return count
}
