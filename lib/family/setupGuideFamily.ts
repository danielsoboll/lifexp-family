import type { Family } from './types'
import { readGuideLocalCache, mergeFamilyGuideFlags } from './setupGuideLocalCache'
import type { SetupGuideState, SetupGuideStep } from './setupGuide'

/** Setup-Assistent aus Familienzeile (DB) + lokalem Cache. */
export function setupGuideStateFromFamily(family: Family | null | undefined): SetupGuideState | null {
  if (!family?.id) return null
  const merged = mergeFamilyGuideFlags(family, readGuideLocalCache(family.id))
  return {
    familyId: family.id,
    finished: merged.guide_finished,
    welcomeMembersIntroSeen: merged.guide_welcome_seen,
    visitedQuestNew: merged.guide_quest_seen,
    visitedAdminAfterQuest: merged.guide_invite_seen,
    visitedMemberProfile: merged.guide_profile_seen,
  }
}

export type SetupGuideDbPatch = {
  guide_welcome_seen?: boolean
  guide_quest_seen?: boolean
  guide_invite_seen?: boolean
  guide_profile_seen?: boolean
  guide_finished?: boolean
  guide_solo_quest_seen?: boolean
}

export function setupGuidePatchForStep(step: SetupGuideStep): SetupGuideDbPatch {
  switch (step) {
    case 'welcome_members':
      return { guide_welcome_seen: true }
    case 'first_quest':
      return { guide_quest_seen: true }
    case 'invite_code':
      return { guide_invite_seen: true }
    case 'member_profile':
      return { guide_profile_seen: true }
    case 'member_ready':
      return {}
    case 'complete':
      return { guide_finished: true }
  }
}

export function setupGuidePatchForAdminVisit(state: SetupGuideState): SetupGuideDbPatch {
  const patch: SetupGuideDbPatch = {}
  if (!state.welcomeMembersIntroSeen) patch.guide_welcome_seen = true
  if (state.visitedQuestNew && !state.visitedAdminAfterQuest) patch.guide_invite_seen = true
  return patch
}

export function setupGuidePatchFromLegacyLocal(input: {
  welcomeMembersIntroSeen?: boolean
  visitedQuestNew?: boolean
  visitedAdminAfterQuest?: boolean
  visitedMemberProfile?: boolean
  finished?: boolean
  dismissedStep?: SetupGuideStep | null
}): SetupGuideDbPatch {
  const patch: SetupGuideDbPatch = {}
  if (input.welcomeMembersIntroSeen || input.dismissedStep === 'welcome_members') {
    patch.guide_welcome_seen = true
  }
  if (input.visitedQuestNew || input.dismissedStep === 'first_quest') {
    patch.guide_quest_seen = true
  }
  if (input.visitedAdminAfterQuest || input.dismissedStep === 'invite_code') {
    patch.guide_invite_seen = true
  }
  if (input.visitedMemberProfile || input.dismissedStep === 'member_profile') {
    patch.guide_profile_seen = true
  }
  if (input.finished || input.dismissedStep === 'complete') {
    patch.guide_finished = true
  }
  return patch
}

export function familyHasAnyGuideProgress(family: Family): boolean {
  return (
    family.guide_welcome_seen ||
    family.guide_quest_seen ||
    family.guide_invite_seen ||
    family.guide_profile_seen ||
    family.guide_finished ||
    family.guide_solo_quest_seen
  )
}
