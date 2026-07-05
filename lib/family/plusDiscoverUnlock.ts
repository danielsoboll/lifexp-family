import { isMemberJoinReadySeen } from './memberJoinGuide'
import { setupGuideStateFromFamily } from './setupGuideFamily'
import type { Family } from './types'

const STORAGE_KEY_PREFIX = 'lifexp_plus_discover_unlocked_v1_'

export const PLUS_DISCOVER_UNLOCK_CHANGED_EVENT = 'lifexp-plus-discover-unlock-changed'

function storageKey(familyId: string): string {
  return `${STORAGE_KEY_PREFIX}${familyId}`
}

export function isPlusDiscoverUnlocked(familyId: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(storageKey(familyId)) === '1'
}

export function markPlusDiscoverUnlocked(familyId: string): void {
  if (typeof window === 'undefined') return
  if (isPlusDiscoverUnlocked(familyId)) return
  localStorage.setItem(storageKey(familyId), '1')
  window.dispatchEvent(new CustomEvent(PLUS_DISCOVER_UNLOCK_CHANGED_EVENT))
}

/** Assistent abgeschlossen oder Mitglied hat „Bin dabei!“ bestätigt. */
export function isPlusDiscoverOnboardingReady(input: {
  family: Family | null | undefined
  memberId: string | null | undefined
}): boolean {
  if (!input.family?.id) return false
  const state = setupGuideStateFromFamily(input.family)
  if (state?.finished) return true
  if (input.memberId && isMemberJoinReadySeen(input.memberId)) return true
  return false
}

export function shouldShowPlusHeaderDiscover(input: {
  familyId: string | null | undefined
  onboardingReady: boolean
  questUnlockReady: boolean
}): boolean {
  if (!input.familyId || !input.onboardingReady || !input.questUnlockReady) return false
  return true
}
