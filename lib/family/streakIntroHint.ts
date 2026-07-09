import { markMemberStreakIntroSeen as markMemberStreakIntroSeenDb } from './setupGuidePersistence'

import { scopedLocalGet, scopedLocalSet } from '../scopedClientStorage'

export const MEMBER_STREAK_INTRO_CACHE_KEY = 'lifexp_member_streak_intro_v1'

export const MEMBER_STREAK_INTRO_CHANGED_EVENT = 'lifexp-streak-intro-changed'

export function memberStreakIntroStorageKey(memberKind: 'parent' | 'child', memberId: string): string {
  return `${memberKind}:${memberId}`
}

function readAll(): Record<string, true> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = scopedLocalGet(MEMBER_STREAK_INTRO_CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, true>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(map: Record<string, true>): void {
  if (typeof window === 'undefined') return
  try {
    scopedLocalSet(MEMBER_STREAK_INTRO_CACHE_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function readMemberStreakIntroLocal(memberKind: 'parent' | 'child', memberId: string): boolean {
  const key = memberStreakIntroStorageKey(memberKind, memberId)
  return readAll()[key] === true
}

export function markMemberStreakIntroLocal(memberKind: 'parent' | 'child', memberId: string): void {
  const map = readAll()
  map[memberStreakIntroStorageKey(memberKind, memberId)] = true
  writeAll(map)
  notifyMemberStreakIntroChanged()
}

export function isMemberStreakIntroSeen(input: {
  memberKind: 'parent' | 'child'
  memberId: string
  dbSeen: boolean
}): boolean {
  return input.dbSeen || readMemberStreakIntroLocal(input.memberKind, input.memberId)
}

export function notifyMemberStreakIntroChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(MEMBER_STREAK_INTRO_CHANGED_EVENT))
}

export async function persistMemberStreakIntroSeen(input: {
  memberKind: 'parent' | 'child'
  memberId: string
  dbSeen?: boolean
}): Promise<void> {
  if (
    isMemberStreakIntroSeen({
      memberKind: input.memberKind,
      memberId: input.memberId,
      dbSeen: input.dbSeen === true,
    })
  ) {
    return
  }
  markMemberStreakIntroLocal(input.memberKind, input.memberId)
  await markMemberStreakIntroSeenDb(input)
}
