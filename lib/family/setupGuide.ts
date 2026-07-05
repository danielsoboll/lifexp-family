import { isMemberJoinReadySeen, markMemberJoinReadySeen } from './memberJoinGuide'
import type { Family } from './types'
import {
  familyHasAnyGuideProgress,
  setupGuidePatchForAdminVisit,
  setupGuidePatchForStep,
  setupGuidePatchFromLegacyLocal,
  setupGuideStateFromFamily,
} from './setupGuideFamily'
import { mergeGuideLocalCache, readGuideLocalCache } from './setupGuideLocalCache'
import { updateFamilySetupGuide } from './setupGuidePersistence'
import type { SetupGuideDbPatch } from './setupGuideFamily'

const LEGACY_STORAGE_KEY = 'lifexp_family_setup_guide_v1'

/** Pause vor erstem Assistenten-Hinweis und vor jedem neuen Schritt. */
export const SETUP_GUIDE_STEP_REVEAL_DELAY_MS = 1000

export type SetupGuideStep =
  | 'welcome_members'
  | 'first_quest'
  | 'invite_code'
  | 'member_profile'
  | 'member_ready'
  | 'complete'

export type SetupGuideTarget = 'admin' | 'new_quest' | 'first_member' | 'own_profile'

export type SetupGuideState = {
  familyId: string
  finished: boolean
  welcomeMembersIntroSeen: boolean
  visitedQuestNew: boolean
  visitedAdminAfterQuest: boolean
  visitedMemberProfile: boolean
}

type LegacySetupGuideState = SetupGuideState & {
  dismissedStep?: SetupGuideStep | null
}

function readLegacyAll(): Record<string, LegacySetupGuideState> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, LegacySetupGuideState>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function clearLegacyForFamily(familyId: string): void {
  if (typeof window === 'undefined') return
  try {
    const map = readLegacyAll()
    if (!map[familyId]) return
    delete map[familyId]
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

async function persistGuidePatch(familyId: string, patch: SetupGuideDbPatch): Promise<void> {
  if (Object.keys(patch).length === 0) return
  mergeGuideLocalCache(familyId, patch)
  notifySetupGuideChanged()
  await updateFamilySetupGuide(familyId, patch)
}

export { setupGuideStateFromFamily } from './setupGuideFamily'
export { markMemberJoinReadySeen, isMemberJoinReadySeen } from './memberJoinGuide'

export function totalFamilyMembers(parentCount: number, childCount: number): number {
  return parentCount + childCount
}

export function resolveSetupGuideStep(input: {
  state: SetupGuideState
  parentCount: number
  childCount: number
  canAdmin: boolean
  memberId?: string | null
}): SetupGuideStep | null {
  if (input.state.finished) return null

  if (!input.canAdmin) {
    if (!input.state.visitedQuestNew) return 'first_quest'
    if (!isMemberJoinReadySeen(input.memberId)) return 'member_ready'
    return null
  }

  const members = totalFamilyMembers(input.parentCount, input.childCount)

  if (!input.state.welcomeMembersIntroSeen || members < 2) return 'welcome_members'
  if (!input.state.visitedQuestNew) return 'first_quest'
  if (!input.state.visitedAdminAfterQuest) return 'invite_code'
  if (!input.state.visitedMemberProfile) return 'member_profile'
  return 'complete'
}

export function setupGuideCopy(
  step: SetupGuideStep,
  context?: { welcomeMembersIntroSeen?: boolean },
): { title: string; body: string; target: SetupGuideTarget | null } {
  switch (step) {
    case 'welcome_members':
      if (context?.welcomeMembersIntroSeen) {
        return {
          title: 'Familienmitglieder anlegen',
          body: 'Lege mindestens ein weiteres Familienmitglied unter Admin an, bevor du Quests eintragen kannst',
          target: 'admin',
        }
      }
      return {
        title: 'Willkommen bei LifeXP!',
        body: 'Bitte lege zuerst deine Familienmitglieder an — tippe dafür auf Admin',
        target: 'admin',
      }
    case 'first_quest':
      return {
        title: 'Quests eintragen',
        body: 'Lege hier die erste Aufgabe für ein Familienmitglied an',
        target: 'new_quest',
      }
    case 'invite_code':
      return {
        title: 'Weiter geht’s',
        body: 'Deine Familienmitglieder können sich über den Einladungscode mit deiner Familie verbinden',
        target: 'admin',
      }
    case 'member_profile':
      return {
        title: 'Fast geschafft',
        body: 'Nun kann jedes Familienmitglied Aufgaben einstellen und seine Aufgaben verfolgen',
        target: 'first_member',
      }
    case 'member_ready':
      return {
        title: 'Bin dabei!',
        body: 'Lege eine Aufgabe für ein anderes Familienmitglied an — oder erledige deine eigenen Quests in der Übersicht.',
        target: 'new_quest',
      }
    case 'complete':
      return {
        title: 'Super, du hast LifeXP Family verstanden!',
        body: 'Viel Spaß und Erfolg bei der Benutzung',
        target: null,
      }
  }
}

export async function migrateLegacySetupGuideIfNeeded(family: Family): Promise<boolean> {
  if (familyHasAnyGuideProgress(family)) return false
  const legacy = readLegacyAll()[family.id]
  if (!legacy) return false

  const patch = setupGuidePatchFromLegacyLocal({
    welcomeMembersIntroSeen: legacy.welcomeMembersIntroSeen,
    visitedQuestNew: legacy.visitedQuestNew,
    visitedAdminAfterQuest: legacy.visitedAdminAfterQuest,
    visitedMemberProfile: legacy.visitedMemberProfile,
    finished: legacy.finished,
    dismissedStep: legacy.dismissedStep ?? null,
  })

  if (Object.keys(patch).length === 0) return false

  const { error } = await updateFamilySetupGuide(family.id, patch)
  if (error) return false
  clearLegacyForFamily(family.id)
  return true
}

export async function markSetupGuideQuestVisited(
  family: Family | null | undefined,
  memberCounts?: { parentCount: number; childCount: number },
): Promise<void> {
  if (!family?.id) return
  const state = setupGuideStateFromFamily(family)
  if (!state || state.visitedQuestNew) return
  if (
    memberCounts &&
    totalFamilyMembers(memberCounts.parentCount, memberCounts.childCount) < 2
  ) {
    return
  }
  await persistGuidePatch(family.id, setupGuidePatchForStep('first_quest'))
}

export async function markSetupGuideAdminVisited(
  family: Family | null | undefined,
  memberCounts?: { parentCount: number; childCount: number },
): Promise<void> {
  if (!family?.id) return
  const state = setupGuideStateFromFamily(family)
  if (!state) return
  const members = memberCounts
    ? totalFamilyMembers(memberCounts.parentCount, memberCounts.childCount)
    : 2
  const patch = setupGuidePatchForAdminVisit(state, members)
  await persistGuidePatch(family.id, patch)
}

export async function markSetupGuideMemberVisited(family: Family | null | undefined): Promise<void> {
  if (!family?.id) return
  const state = setupGuideStateFromFamily(family)
  if (!state || state.visitedMemberProfile) return
  await persistGuidePatch(family.id, setupGuidePatchForStep('member_profile'))
}

export async function dismissSetupGuideStep(family: Family | null | undefined, step: SetupGuideStep): Promise<void> {
  if (!family?.id) return
  await persistGuidePatch(family.id, setupGuidePatchForStep(step))
}

export async function dismissSoloQuestHint(family: Family | null | undefined): Promise<void> {
  if (!family?.id) return
  const merged = setupGuideStateFromFamily(family)
  if (!merged) return
  const local = readGuideLocalCache(family.id)
  if (family.guide_solo_quest_seen || local.guide_solo_quest_seen) return
  await persistGuidePatch(family.id, { guide_solo_quest_seen: true })
}

export function setupGuideTargetAttr(target: SetupGuideTarget): string {
  return `setup-guide-${target}`
}

export function firstOtherMemberHref(input: {
  memberKind: 'parent' | 'child' | null
  memberId: string | null
  parents: { id: string }[]
  children: { id: string }[]
}): string | null {
  if (!input.memberId) return null
  for (const parent of input.parents) {
    if (input.memberKind === 'parent' && parent.id === input.memberId) continue
    return `/parents/${parent.id}`
  }
  for (const child of input.children) {
    if (input.memberKind === 'child' && child.id === input.memberId) continue
    return `/children/${child.id}`
  }
  return null
}

export function isSoloFamily(parentCount: number, childCount: number): boolean {
  return totalFamilyMembers(parentCount, childCount) < 2
}

export function soloQuestBlockedMessage(): { title: string; body: string } {
  return {
    title: 'Erst Familienmitglieder anlegen',
    body: 'Du kannst keine Aufgaben für dich selbst eintragen. Lege zuerst weitere Familienmitglieder unter Admin an',
  }
}

export function notifySetupGuideChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('lifexp-setup-guide-changed'))
}
