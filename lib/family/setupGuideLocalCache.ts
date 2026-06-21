import type { SetupGuideDbPatch } from './setupGuideFamily'

export const GUIDE_LOCAL_CACHE_KEY = 'lifexp_family_guide_cache_v1'

type GuideLocalCache = SetupGuideDbPatch

function readAll(): Record<string, GuideLocalCache> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(GUIDE_LOCAL_CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, GuideLocalCache>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(map: Record<string, GuideLocalCache>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(GUIDE_LOCAL_CACHE_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function readGuideLocalCache(familyId: string): GuideLocalCache {
  return readAll()[familyId] ?? {}
}

export function mergeGuideLocalCache(familyId: string, patch: SetupGuideDbPatch): GuideLocalCache {
  const map = readAll()
  const prev = map[familyId] ?? {}
  const next: GuideLocalCache = { ...prev, ...patch }
  map[familyId] = next
  writeAll(map)
  return next
}

export function clearGuideLocalCache(familyId: string): void {
  const map = readAll()
  if (!map[familyId]) return
  delete map[familyId]
  writeAll(map)
}

/** Familienzeile + lokaler Cache (OR) — Cache überlebt DB-Lag und fehlende Migration. */
export function mergeFamilyGuideFlags(
  family: {
    id: string
    guide_welcome_seen: boolean
    guide_quest_seen: boolean
    guide_invite_seen: boolean
    guide_profile_seen: boolean
    guide_finished: boolean
    guide_solo_quest_seen: boolean
  },
  local: GuideLocalCache,
): typeof family {
  return {
    ...family,
    guide_welcome_seen: family.guide_welcome_seen || local.guide_welcome_seen === true,
    guide_quest_seen: family.guide_quest_seen || local.guide_quest_seen === true,
    guide_invite_seen: family.guide_invite_seen || local.guide_invite_seen === true,
    guide_profile_seen: family.guide_profile_seen || local.guide_profile_seen === true,
    guide_finished: family.guide_finished || local.guide_finished === true,
    guide_solo_quest_seen: family.guide_solo_quest_seen || local.guide_solo_quest_seen === true,
  }
}
