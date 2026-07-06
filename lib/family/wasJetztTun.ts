import { cetToday } from '../cetDate'
import { readFamilySession } from '../familySession'
import { supabase } from '../supabase'
import { fetchChildById, fetchChildrenForFamily } from './children'
import { fetchMemberStreakClaimedToday } from './dailyStreak'
import { fetchParentById } from './families'
import { formatParentDisplayName } from './familyDisplayName'
import {
  countAllQuestsAwaitingFamilyConfirmation,
  countQuestsAwaitingConfirmation,
} from './familyQuestConference'
import { canAdminForChildProfile, canAdminForParentProfile } from './memberAdmin'
import type { ParentGender } from './memberGender'
import { fetchMemberDeviceSettings } from './memberSettings'
import { fetchParentsForFamily } from './members'
import {
  countPersonalGoalsAwaitingXp,
  fetchFamilyPersonalGoalsAwaitingXp,
  fetchMemberPersonalGoals,
  type PersonalGoalAwaitingXpItem,
} from './personalGoals'
import {
  countFamilyPersonalGoalsAwaitingXp,
  fetchFamilyPersonalGoals,
  fetchFamilyPersonalGoalsAwaitingXpList,
  type FamilyPersonalGoal,
} from './familyPersonalGoals'
import { fulfillmentForMemberOnQuest } from './questConfirmation'
import { fetchFamilyQuestBoard, questAppliesToMember } from './quests'
import type { ChildProfile } from './types'
import type { ParentMember } from './members'

export type FamilyWasJetztTunPriority = 1 | '1a'

export type FamilyWasJetztTunStep = {
  id: string
  href: string
  emoji: string
  title: string
  subtitle: string
  xpHint?: string
  priority?: FamilyWasJetztTunPriority
}

export type FamilyWasJetztTunState = {
  suggestedSteps: FamilyWasJetztTunStep[]
  error: Error | null
}

type FamilyWasJetztTunPoolItem = FamilyWasJetztTunStep & { sortOrder: number }

/** Niedrigere Zahl = höhere Priorität (LifeXP-Logik, deterministisch). */
const SORT = {
  SELF_STREAK: 10,
  PERSONAL_GOAL: 20,
  OPEN_QUEST: 30,
  REMIND_STREAK: 40,
  NO_QUESTS: 50,
  AWAITING: 60,
  FILLER: 200,
  ADMIN_GOAL_XP: 228,
  ADMIN_FAMILY_GOAL_XP: 225,
  ADMIN_AWAITING_CONFIRM: 232,
  ADMIN_PLAN: 240,
  ADMIN_RECOVERY: 510,
  ADMIN_RECURRING: 520,
} as const

/** Gelegentliche Recovery-Erinnerung — nicht an jedem Tag. */
function shouldNudgeRecoveryCode(memberId: string, todayKey: string): boolean {
  const dayNum = Number.parseInt(todayKey.slice(-2), 10)
  if (!Number.isFinite(dayNum)) return false
  const slot = memberId.charCodeAt(0) % 4
  return dayNum % 4 === slot
}

function memberSelfHref(memberKind: 'parent' | 'child', memberId: string): string {
  return memberKind === 'child' ? `/children/${memberId}` : `/parents/${memberId}`
}

function memberHref(memberKind: 'parent' | 'child', memberId: string): string {
  return memberSelfHref(memberKind, memberId)
}

function personalGoalCopy(memberKind: 'parent' | 'child'): { title: string; subtitle: string } {
  if (memberKind === 'child') {
    return {
      title: 'Eigenes Ziel eingeben',
      subtitle:
        'Frag deine Eltern oder Geschwister, für welche Aufgabe sie dir XP geben würden.',
    }
  }
  return {
    title: 'Eigenes Ziel eingeben',
    subtitle: 'Frag deinen Partner oder die Kinder, für welche Aufgabe sie dir XP geben würden.',
  }
}

function noQuestsCopy(memberKind: 'parent' | 'child'): { title: string; subtitle: string } {
  if (memberKind === 'child') {
    return {
      title: 'Aufgaben anfragen',
      subtitle:
        'Du hast noch keine Aufgaben für heute — frage deine Eltern oder Geschwister, dass sie dir Aufgaben einstellen.',
    }
  }
  return {
    title: 'Aufgaben anfragen',
    subtitle:
      'Du hast noch keine Aufgaben für heute — frage deine Familie, dir Aufgaben einzustellen.',
  }
}

function remindStreakCopy(input: {
  memberKind: 'parent' | 'child'
  displayName: string
  gender?: ParentGender
}): string {
  if (input.memberKind === 'parent' && input.gender === 'female') {
    return `${input.displayName} hat heute noch nicht „Heute dabei“ geklickt — geh zu ihr und sage ihr, sie soll das machen.`
  }
  if (input.memberKind === 'parent' && input.gender === 'male') {
    return `${input.displayName} hat heute noch nicht „Heute dabei“ geklickt — geh zu ihm und sage ihm, er soll das machen.`
  }
  return `${input.displayName} hat heute noch nicht „Heute dabei“ geklickt — sag ${input.displayName} Bescheid.`
}

type UnclaimedStreakMember = {
  memberKind: 'parent' | 'child'
  memberId: string
  displayName: string
  gender?: ParentGender
  remindSort: number
}

function pickMemberToRemindForStreak(
  parents: ParentMember[],
  children: ChildProfile[],
  claimedParentIds: Set<string>,
  claimedChildIds: Set<string>,
  selfKind: 'parent' | 'child',
  selfId: string,
): UnclaimedStreakMember | null {
  const candidates: UnclaimedStreakMember[] = []

  for (const parent of parents) {
    if (parent.id === selfId && selfKind === 'parent') continue
    if (claimedParentIds.has(parent.id)) continue
    const displayName = formatParentDisplayName(parent.display_name, parent.gender)
    let remindSort = 20
    if (parent.gender === 'female') remindSort = 0
    else if (parent.gender === 'male') remindSort = 10
    candidates.push({
      memberKind: 'parent',
      memberId: parent.id,
      displayName,
      gender: parent.gender,
      remindSort,
    })
  }

  for (const child of children) {
    if (child.id === selfId && selfKind === 'child') continue
    if (claimedChildIds.has(child.id)) continue
    candidates.push({
      memberKind: 'child',
      memberId: child.id,
      displayName: child.display_name.trim() || 'Geschwister',
      remindSort: 30,
    })
  }

  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.remindSort - b.remindSort || a.displayName.localeCompare(b.displayName, 'de'))
  return candidates[0] ?? null
}

async function fetchFamilyStreakClaimedMemberIds(
  familyId: string,
): Promise<{ parentIds: Set<string>; childIds: Set<string>; error: Error | null }> {
  const { data, error } = await supabase
    .from('daily_xp_entries')
    .select('parent_id, child_id')
    .eq('family_id', familyId)
    .eq('entry_date', cetToday())
    .eq('source', 'streak')

  if (error) {
    if (error.message.includes('parent_id') || error.message.includes('schema cache')) {
      return { parentIds: new Set(), childIds: new Set(), error: null }
    }
    return { parentIds: new Set(), childIds: new Set(), error: new Error(error.message) }
  }

  const parentIds = new Set<string>()
  const childIds = new Set<string>()
  for (const row of data ?? []) {
    const parentId = row.parent_id as string | null
    const childId = row.child_id as string | null
    if (parentId) parentIds.add(parentId)
    if (childId) childIds.add(childId)
  }

  return { parentIds, childIds, error: null }
}

/** Top 3 nach sortOrder — keine Zufallswahl bei Prio-Schritten. */
export function pickFamilyWasJetztTunSuggestions(pool: FamilyWasJetztTunPoolItem[]): FamilyWasJetztTunStep[] {
  return [...pool]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id, 'de'))
    .slice(0, 3)
    .map(({ sortOrder: _sortOrder, ...step }) => step)
}

function buildFamilyWasJetztTunPool(input: {
  memberKind: 'parent' | 'child'
  memberHref: string
  canAdmin: boolean
  streakClaimed: boolean
  openQuests: Array<{ id: string; title: string; xpReward: number }>
  questsAssignedToday: number
  awaitingQuests: number
  personalGoalCount: number
  personalGoalsAwaitingXp: number
  familyPersonalGoalsAwaitingXp: number
  familyGoalsAwaitingXp: PersonalGoalAwaitingXpItem[]
  familyPersonalGoalsAwaiting: FamilyPersonalGoal[]
  familyAwaitingConfirmations: number
  familyAwaitingConfirmationsActionable: number
  recoveryCodePending: boolean
  remindStreakMember: UnclaimedStreakMember | null
}): FamilyWasJetztTunPoolItem[] {
  const pool: FamilyWasJetztTunPoolItem[] = []

  if (!input.streakClaimed) {
    pool.push({
      id: 'streak',
      href: input.memberHref,
      emoji: '🔥',
      title: 'Heute dabei',
      subtitle: 'Tippe „Heute dabei“ und sichere dir +2 XP für heute',
      priority: '1a',
      sortOrder: SORT.SELF_STREAK,
    })
  }

  if (input.familyPersonalGoalsAwaitingXp > 0) {
    pool.push({
      id: 'family-goals-awaiting-xp',
      href: '/quests#familien-sitzung',
      emoji: '👨‍👩‍👧‍👦',
      title: 'Familienziel wartet',
      subtitle: 'Die nötigen XP müssen von der Familie entschieden werden.',
      priority: 1,
      sortOrder: SORT.PERSONAL_GOAL + 4,
    })
  } else if (input.personalGoalsAwaitingXp > 0) {
    pool.push({
      id: 'personal-goals-awaiting-xp',
      href: `${input.memberHref}?ziele=1`,
      emoji: '⭐',
      title: 'Dein Ziel wartet',
      subtitle: 'Die für dein Ziel nötigen XP müssen von der Familie entschieden werden.',
      priority: 1,
      sortOrder: SORT.PERSONAL_GOAL + 5,
    })
  } else if (input.personalGoalCount === 0) {
    const goalCopy = personalGoalCopy(input.memberKind)
    pool.push({
      id: 'personal-goals',
      href: `${input.memberHref}?ziele=1`,
      emoji: '⭐',
      title: goalCopy.title,
      subtitle: goalCopy.subtitle,
      priority: 1,
      sortOrder: SORT.PERSONAL_GOAL,
    })
  }

  for (const quest of input.openQuests) {
    pool.push({
      id: `open-quest-${quest.id}`,
      href: `${input.memberHref}#quests-heute`,
      emoji: '✅',
      title: quest.title,
      subtitle:
        input.openQuests.length === 1
          ? 'Deine offene Aufgabe für heute'
          : 'Du hast noch offene Aufgaben für heute',
      xpHint: `+${quest.xpReward} XP`,
      priority: 1,
      sortOrder: SORT.OPEN_QUEST,
    })
  }

  if (input.remindStreakMember) {
    const { memberKind, memberId, displayName, gender } = input.remindStreakMember
    pool.push({
      id: `remind-streak-${memberKind}-${memberId}`,
      href: memberHref(memberKind, memberId),
      emoji: '🔥',
      title: `${displayName} erinnern`,
      subtitle: remindStreakCopy({ memberKind, displayName, gender }),
      sortOrder: SORT.REMIND_STREAK,
    })
  }

  if (input.questsAssignedToday === 0) {
    const noQuestCopy = noQuestsCopy(input.memberKind)
    pool.push({
      id: 'ask-for-quests',
      href: '/',
      emoji: '💬',
      title: noQuestCopy.title,
      subtitle: noQuestCopy.subtitle,
      priority: 1,
      sortOrder: SORT.NO_QUESTS,
    })
  }

  if (input.awaitingQuests > 0) {
    pool.push({
      id: 'awaiting-quests',
      href: `${input.memberHref}#quests-heute`,
      emoji: '⏳',
      title: 'Auf Bestätigung warten',
      subtitle:
        input.awaitingQuests === 1
          ? 'Eine Aufgabe wartet auf OK von der Familie'
          : `${input.awaitingQuests} Aufgaben warten auf OK von der Familie`,
      sortOrder: SORT.AWAITING,
    })
  }

  pool.push({
    id: 'family-conference',
    href: '/',
    emoji: '👨‍👩‍👧‍👦',
    title: 'Familien-Konferenz',
    subtitle: 'Kurz zusammensetzen — wer macht was heute?',
    sortOrder: SORT.FILLER,
  })

  pool.push({
    id: 'verlauf',
    href: '/verlauf',
    emoji: '📊',
    title: 'Fortschritt der Familie',
    subtitle: 'Wer hat heute schon XP gesammelt?',
    sortOrder: SORT.FILLER + 1,
  })

  if (input.canAdmin) {
    for (const goal of input.familyPersonalGoalsAwaiting) {
      pool.push({
        id: `admin-family-goal-xp-${goal.id}`,
        href: '/quests#familien-sitzung',
        emoji: '👨‍👩‍👧‍👦',
        title: 'XP für Familienziel',
        subtitle: `„${goal.title}" — XP von der Familie festlegen`,
        priority: 1,
        sortOrder: SORT.ADMIN_FAMILY_GOAL_XP,
      })
    }

    for (const item of input.familyGoalsAwaitingXp) {
      pool.push({
        id: `admin-goal-xp-${item.goal.id}`,
        href: '/quests#familien-sitzung',
        emoji: '⭐',
        title: `XP für ${item.memberLabel}`,
        subtitle: `Ziel „${item.goal.title}" — XP von der Familie festlegen`,
        priority: 1,
        sortOrder: SORT.ADMIN_GOAL_XP,
      })
    }

    if (input.familyAwaitingConfirmationsActionable > 0) {
      pool.push({
        id: 'admin-awaiting-confirmations',
        href: '/quests#familien-sitzung',
        emoji: '✅',
        title: 'Quests bestätigen',
        subtitle:
          input.familyAwaitingConfirmationsActionable === 1
            ? `${input.familyAwaitingConfirmationsActionable} Meldung wartet auf dein OK`
            : `${input.familyAwaitingConfirmationsActionable} Meldungen warten auf dein OK`,
        priority: 1,
        sortOrder: SORT.ADMIN_AWAITING_CONFIRM,
      })
    } else if (input.familyAwaitingConfirmations > 0) {
      pool.push({
        id: 'family-awaiting-confirmations',
        href: '/quests#familien-sitzung',
        emoji: '✅',
        title: 'Familien-Sitzung',
        subtitle:
          input.familyAwaitingConfirmations === 1
            ? 'Eine Quest wartet auf OK von der Familie'
            : `${input.familyAwaitingConfirmations} Quests warten auf OK von der Familie`,
        sortOrder: SORT.ADMIN_AWAITING_CONFIRM,
      })
    }

    pool.push({
      id: 'plan-quest',
      href: '/quests/new',
      emoji: '🎯',
      title: 'Quest für die Familie planen',
      subtitle: 'Neue Aufgabe einstellen oder zuweisen',
      sortOrder: SORT.ADMIN_PLAN,
    })

    if (input.recoveryCodePending) {
      pool.push({
        id: 'admin-recovery-code',
        href: '/was-jetzt-tun/recovery',
        emoji: '🔐',
        title: 'Recovery-Code sichern',
        subtitle: 'Screenshot machen — damit dein Profil bei Gerätewechsel erhalten bleibt',
        sortOrder: SORT.ADMIN_RECOVERY,
      })
    }

    pool.push({
      id: 'quests-recurring',
      href: '/quests/recurring',
      emoji: '🔁',
      title: 'Wiederkehrende Quests',
      subtitle: 'Automatische Aufgaben einrichten oder anpassen',
      sortOrder: SORT.ADMIN_RECURRING,
    })
    pool.push({
      id: 'quests-overview',
      href: '/quests',
      emoji: '📋',
      title: 'Quests verwalten',
      subtitle: 'Heutige Aufgaben und Zuweisungen',
      sortOrder: SORT.ADMIN_RECURRING + 1,
    })
  }

  return pool
}

export async function fetchFamilyWasJetztTunState(): Promise<FamilyWasJetztTunState> {
  const session = readFamilySession()
  if (!session) {
    return { suggestedSteps: [], error: new Error('Bitte zuerst anmelden.') }
  }

  const { familyId, memberKind, memberId } = session
  const memberHref = memberSelfHref(memberKind, memberId)

  const todayKey = cetToday()

  const [
    { board, error: questsError },
    { claimed: streakClaimed, error: streakError },
    { goals, error: goalsError },
    profileResult,
    { parents, error: parentsError },
    { children, error: childrenError },
    streakClaimedIds,
    deviceSettingsResult,
  ] = await Promise.all([
    fetchFamilyQuestBoard(familyId),
    fetchMemberStreakClaimedToday({ familyId, memberKind, memberId }),
    fetchMemberPersonalGoals(familyId, { memberKind, memberId }),
    memberKind === 'child' ? fetchChildById(memberId) : fetchParentById(memberId),
    fetchParentsForFamily(familyId),
    fetchChildrenForFamily(familyId),
    fetchFamilyStreakClaimedMemberIds(familyId),
    fetchMemberDeviceSettings(memberKind, memberId),
  ])

  const familyGoalsResult = await fetchFamilyPersonalGoalsAwaitingXp(familyId, parents, children)
  const familyPersonalGoalsResult = await fetchFamilyPersonalGoalsAwaitingXpList(familyId)
  const allFamilyPersonalGoals = await fetchFamilyPersonalGoals(familyId)

  const fetchError =
    questsError ??
    streakError ??
    goalsError ??
    profileResult.error ??
    parentsError ??
    childrenError ??
    streakClaimedIds.error
  if (fetchError) {
    return { suggestedSteps: [], error: fetchError }
  }

  const deviceSettings = deviceSettingsResult.error
    ? { appInstalled: false, appLater: false, recCode: null, recCodeOk: true, error: null }
    : deviceSettingsResult

  const familyGoalsAwaitingXp = familyGoalsResult.error ? [] : familyGoalsResult.items
  const familyPersonalGoalsAwaiting = familyPersonalGoalsResult.error ? [] : familyPersonalGoalsResult.goals
  const allFamilyPersonalGoalsList = allFamilyPersonalGoals.error ? [] : allFamilyPersonalGoals.goals

  const canAdmin =
    memberKind === 'child' && 'child' in profileResult && profileResult.child
      ? canAdminForChildProfile(
          profileResult.child.gender,
          profileResult.child.age,
          profileResult.child.can_admin,
        )
      : memberKind === 'parent' && 'parent' in profileResult && profileResult.parent
        ? canAdminForParentProfile(profileResult.parent.gender, profileResult.parent.can_admin)
        : false

  const allFamilyQuests = [...board.todayAndTomorrow, ...board.yesterdayOpen]
  const sessionForConfirm = readFamilySession()

  const memberQuests = allFamilyQuests.filter((quest) =>
    questAppliesToMember(quest.child_id, quest.assignees, memberKind, memberId),
  )

  const openQuests = memberQuests
    .filter((quest) => fulfillmentForMemberOnQuest(quest, memberKind, memberId) === 'open')
    .map((quest) => ({ id: quest.id, title: quest.title, xpReward: quest.xp_reward }))

  const awaitingQuests = memberQuests.filter(
    (quest) => fulfillmentForMemberOnQuest(quest, memberKind, memberId) === 'awaiting_creator',
  ).length

  const remindStreakMember = pickMemberToRemindForStreak(
    parents,
    children,
    streakClaimedIds.parentIds,
    streakClaimedIds.childIds,
    memberKind,
    memberId,
  )

  const recoveryCodePending =
    canAdmin &&
    !deviceSettings.recCodeOk &&
    Boolean(deviceSettings.recCode) &&
    shouldNudgeRecoveryCode(memberId, todayKey)

  const pool = buildFamilyWasJetztTunPool({
    memberKind,
    memberHref,
    canAdmin,
    streakClaimed,
    openQuests,
    questsAssignedToday: memberQuests.length,
    awaitingQuests,
    personalGoalCount: goals.length,
    personalGoalsAwaitingXp: countPersonalGoalsAwaitingXp(goals),
    familyPersonalGoalsAwaitingXp: countFamilyPersonalGoalsAwaitingXp(allFamilyPersonalGoalsList),
    familyGoalsAwaitingXp: familyGoalsAwaitingXp,
    familyPersonalGoalsAwaiting: familyPersonalGoalsAwaiting,
    familyAwaitingConfirmations: countAllQuestsAwaitingFamilyConfirmation(allFamilyQuests),
    familyAwaitingConfirmationsActionable: countQuestsAwaitingConfirmation(
      allFamilyQuests,
      sessionForConfirm,
      canAdmin,
    ),
    recoveryCodePending,
    remindStreakMember,
  })

  return { suggestedSteps: pickFamilyWasJetztTunSuggestions(pool), error: null }
}
