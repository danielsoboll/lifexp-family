import { scopedLocalGet, scopedLocalSet } from '../scopedClientStorage'

const MEMBER_JOIN_READY_KEY_PREFIX = 'lifexp_member_join_ready_'

export function isMemberJoinReadySeen(memberId: string | null | undefined): boolean {
  if (!memberId || typeof window === 'undefined') return false
  try {
    return scopedLocalGet(`${MEMBER_JOIN_READY_KEY_PREFIX}${memberId}`) === '1'
  } catch {
    return false
  }
}

export function markMemberJoinReadySeen(memberId: string): void {
  if (typeof window === 'undefined') return
  try {
    scopedLocalSet(`${MEMBER_JOIN_READY_KEY_PREFIX}${memberId}`, '1')
    window.dispatchEvent(new Event('lifexp-setup-guide-changed'))
  } catch {
    /* ignore */
  }
}
