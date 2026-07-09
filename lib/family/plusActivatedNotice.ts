import { scopedLocalGet, scopedLocalSet } from '../scopedClientStorage'

const STORAGE_KEY_PREFIX = 'lifexp_plus_activated_notice_v1_'

export const PLUS_ACTIVATED_NOTICE_CHANGED_EVENT = 'lifexp-plus-activated-notice-changed'

function storageKey(familyId: string): string {
  return `${STORAGE_KEY_PREFIX}${familyId}`
}

export function hasSeenPlusActivatedNotice(familyId: string): boolean {
  if (typeof window === 'undefined') return true
  return scopedLocalGet(storageKey(familyId)) === '1'
}

export function markPlusActivatedNoticeSeen(familyId: string): void {
  if (typeof window === 'undefined') return
  scopedLocalSet(storageKey(familyId), '1')
  window.dispatchEvent(new CustomEvent(PLUS_ACTIVATED_NOTICE_CHANGED_EVENT))
}
