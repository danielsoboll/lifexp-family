import { formatFamilyHeading, formatParentDisplayName } from './familyDisplayName'
import type { ParentGender } from './memberGender'
import { isFamilyWideQuest } from './questConfirmation'
import { normalizeMemberAccentKey, type MemberAccentKey } from './memberAccentColor'
import type { ParentMember } from './members'
import { compareQuestsForOverview, questPrimaryAssignee } from './quests'
import type { ChildWithTodayXp, QuestAssignee, QuestFulfillmentStatus, QuestWithCompletion } from './types'

function questStatusSortOrder(status: QuestFulfillmentStatus): number {
  if (status === 'open') return 0
  if (status === 'awaiting_creator') return 1
  return 2
}

/** Offen → wartet auf OK → erledigt; innerhalb gleicher Stufe nach Datum/Titel. */
export function sortQuestsForDisplayGroup(quests: QuestWithCompletion[]): QuestWithCompletion[] {
  return [...quests].sort((a, b) => {
    const statusCmp = questStatusSortOrder(a.fulfillmentStatus) - questStatusSortOrder(b.fulfillmentStatus)
    if (statusCmp !== 0) return statusCmp
    return compareQuestsForOverview(a, b)
  })
}

export function partitionQuestsByDone(quests: QuestWithCompletion[]): {
  active: QuestWithCompletion[]
  done: QuestWithCompletion[]
} {
  const sorted = sortQuestsForDisplayGroup(quests)
  const active: QuestWithCompletion[] = []
  const done: QuestWithCompletion[] = []
  for (const quest of sorted) {
    if (quest.fulfillmentStatus === 'done') done.push(quest)
    else active.push(quest)
  }
  return { active, done }
}

const PARENT_GENDER_ORDER: Record<ParentGender, number> = {
  male: 0,
  female: 1,
  opa: 2,
  oma: 3,
}

export function compareParentsForDisplay(
  a: Pick<ParentMember, 'gender' | 'display_name'>,
  b: Pick<ParentMember, 'gender' | 'display_name'>,
): number {
  const genderCmp = PARENT_GENDER_ORDER[a.gender] - PARENT_GENDER_ORDER[b.gender]
  if (genderCmp !== 0) return genderCmp
  return a.display_name.localeCompare(b.display_name, 'de')
}

export function compareChildrenForDisplay(
  a: Pick<ChildWithTodayXp, 'age' | 'sort_order' | 'display_name'>,
  b: Pick<ChildWithTodayXp, 'age' | 'sort_order' | 'display_name'>,
): number {
  const ageA = a.age ?? -1
  const ageB = b.age ?? -1
  if (ageA !== ageB) return ageB - ageA
  const orderCmp = a.sort_order - b.sort_order
  if (orderCmp !== 0) return orderCmp
  return a.display_name.localeCompare(b.display_name, 'de')
}

function assigneeMapKey(assignee: QuestAssignee): string {
  return `${assignee.type}:${assignee.id}`
}

export type QuestMemberGroup = {
  kind: 'member'
  assignee: QuestAssignee
  label: string
  accentKey: MemberAccentKey
  quests: QuestWithCompletion[]
}

export type QuestFamilyGroup = {
  kind: 'family'
  label: string
  quests: QuestWithCompletion[]
}

export type QuestDisplayGroup = QuestFamilyGroup | QuestMemberGroup

export function groupQuestsForDisplay(
  quests: QuestWithCompletion[],
  parents: ParentMember[],
  children: ChildWithTodayXp[],
  familyName: string | null | undefined,
): QuestDisplayGroup[] {
  const familyQuests: QuestWithCompletion[] = []
  const byAssignee = new Map<string, QuestWithCompletion[]>()

  for (const quest of quests) {
    if (isFamilyWideQuest(quest)) {
      familyQuests.push(quest)
      continue
    }
    const assignee = questPrimaryAssignee(quest)
    if (!assignee) continue
    const key = assigneeMapKey(assignee)
    const list = byAssignee.get(key) ?? []
    list.push(quest)
    byAssignee.set(key, list)
  }

  const groups: QuestDisplayGroup[] = []

  if (familyQuests.length > 0) {
    groups.push({
      kind: 'family',
      label: formatFamilyHeading(familyName),
      quests: sortQuestsForDisplayGroup(familyQuests),
    })
  }

  for (const parent of [...parents].sort(compareParentsForDisplay)) {
    const key = assigneeMapKey({ type: 'parent', id: parent.id })
    const memberQuests = byAssignee.get(key)
    if (!memberQuests?.length) continue
    groups.push({
      kind: 'member',
      assignee: { type: 'parent', id: parent.id },
      label: formatParentDisplayName(parent.display_name, parent.gender),
      accentKey: normalizeMemberAccentKey(parent.accent_key),
      quests: sortQuestsForDisplayGroup(memberQuests),
    })
  }

  for (const child of [...children].sort(compareChildrenForDisplay)) {
    const key = assigneeMapKey({ type: 'child', id: child.id })
    const memberQuests = byAssignee.get(key)
    if (!memberQuests?.length) continue
    groups.push({
      kind: 'member',
      assignee: { type: 'child', id: child.id },
      label: child.display_name.trim() || 'Kind',
      accentKey: normalizeMemberAccentKey(child.accent_key),
      quests: sortQuestsForDisplayGroup(memberQuests),
    })
  }

  return groups
}

/** @deprecated Nutze groupQuestsForDisplay */
export function groupQuestsByMember(
  quests: QuestWithCompletion[],
  parents: ParentMember[],
  children: ChildWithTodayXp[],
): QuestMemberGroup[] {
  return groupQuestsForDisplay(quests, parents, children, null).filter(
    (group): group is QuestMemberGroup => group.kind === 'member',
  )
}

export type OrderedAssigneeOption = {
  type: 'parent' | 'child'
  id: string
  label: string
}

export function buildOrderedAssigneeOptions(
  parents: ParentMember[],
  children: ChildWithTodayXp[],
  exclude?: QuestAssignee | null,
): OrderedAssigneeOption[] {
  const options: OrderedAssigneeOption[] = []

  for (const parent of [...parents].sort(compareParentsForDisplay)) {
    if (exclude && exclude.type === 'parent' && exclude.id === parent.id) continue
    options.push({
      type: 'parent',
      id: parent.id,
      label: formatParentDisplayName(parent.display_name, parent.gender),
    })
  }

  for (const child of [...children].sort(compareChildrenForDisplay)) {
    if (exclude && exclude.type === 'child' && exclude.id === child.id) continue
    options.push({
      type: 'child',
      id: child.id,
      label: child.display_name.trim() || 'Kind',
    })
  }

  return options
}

export function orderedAssigneeOptionsToAssignees(options: OrderedAssigneeOption[]): QuestAssignee[] {
  return options.map((option) => ({ type: option.type, id: option.id }))
}

export function buildAllFamilyAssignees(parents: ParentMember[], children: ChildWithTodayXp[]): QuestAssignee[] {
  return orderedAssigneeOptionsToAssignees(buildOrderedAssigneeOptions(parents, children, null))
}
