import {
  AVATAR_ASSET_VERSION,
  normalizeAvatarSrc,
  preloadAvatarAsset,
  clearAvatarAssetPreloadCache,
} from './avatarAsset'
import { normalizeAvatarGender, type AvatarGender } from './avatarLibrary'

export { AVATAR_ASSET_VERSION } from './avatarAsset'

const CACHE_KEY = 'lifexp_family_avatar_display'

export type AvatarDisplayCache = {
  src: string
  avatarGender: AvatarGender
  dailyXp?: number
  level?: number
  totalXp?: number
  assetVersion?: number
}

export type AvatarDisplaySnapshot = {
  src: string | null
  avatarGender: AvatarGender
  dailyXp: number | null
  level: number | null
  totalXp: number | null
}

function isAvatarSrc(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/avatars/')
}

/** Intro-Bilder nicht als Startseiten-Puffer verwenden. */
export function avatarSrcMatchesGender(src: string, avatarGender: AvatarGender): boolean {
  if (src.includes('Together')) return false
  return avatarGender === 'female' ? src.includes('Avatar_2') : src.includes('Avatar_1')
}

export function loadAvatarDisplayCache(): AvatarDisplayCache | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      src?: unknown
      avatarGender?: unknown
      dailyXp?: unknown
      level?: unknown
      totalXp?: unknown
      assetVersion?: unknown
    }
    if (!isAvatarSrc(parsed.src)) return null
    const src = normalizeAvatarSrc(parsed.src)
    const avatarGender = normalizeAvatarGender(parsed.avatarGender)
    if (!avatarSrcMatchesGender(src, avatarGender)) return null
    const dailyXp =
      typeof parsed.dailyXp === 'number' && Number.isFinite(parsed.dailyXp)
        ? Math.max(0, Math.floor(parsed.dailyXp))
        : undefined
    const level =
      typeof parsed.level === 'number' && Number.isFinite(parsed.level)
        ? Math.max(1, Math.floor(parsed.level))
        : undefined
    const totalXp =
      typeof parsed.totalXp === 'number' && Number.isFinite(parsed.totalXp)
        ? Math.max(0, Math.floor(parsed.totalXp))
        : undefined
    return {
      src,
      avatarGender,
      dailyXp,
      level,
      totalXp,
      assetVersion:
        typeof parsed.assetVersion === 'number' ? parsed.assetVersion : undefined,
    }
  } catch {
    return null
  }
}

export function getCachedAvatarDisplaySnapshot(): AvatarDisplaySnapshot {
  const cached = loadAvatarDisplayCache()
  if (!cached) {
    return { src: null, avatarGender: 'male', dailyXp: null, level: null, totalXp: null }
  }
  return {
    src: cached.src,
    avatarGender: cached.avatarGender,
    dailyXp: cached.dailyXp ?? null,
    level: cached.level ?? null,
    totalXp: cached.totalXp ?? null,
  }
}

export function saveAvatarDisplayCache(entry: AvatarDisplayCache): void {
  if (typeof window === 'undefined') return
  if (!isAvatarSrc(entry.src)) return
  const src = normalizeAvatarSrc(entry.src)
  if (!avatarSrcMatchesGender(src, entry.avatarGender)) return
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      src,
      avatarGender: entry.avatarGender,
      dailyXp:
        typeof entry.dailyXp === 'number' ? Math.max(0, Math.floor(entry.dailyXp)) : undefined,
      level: typeof entry.level === 'number' ? Math.max(1, Math.floor(entry.level)) : undefined,
      totalXp:
        typeof entry.totalXp === 'number' ? Math.max(0, Math.floor(entry.totalXp)) : undefined,
      assetVersion: AVATAR_ASSET_VERSION,
    }),
  )
}

export function loadCachedAvatarGender(): AvatarGender {
  return getCachedAvatarDisplaySnapshot().avatarGender
}

export function clearAvatarDisplayCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CACHE_KEY)
  clearAvatarAssetPreloadCache()
}

/** @deprecated Alias — nutzt `preloadAvatarAsset`. */
export function preloadAvatarImage(src: string): Promise<void> {
  return preloadAvatarAsset(src)
}

export function warmAvatarDisplayCache(): void {
  const cached = loadAvatarDisplayCache()
  if (!cached?.src) return
  void preloadAvatarAsset(cached.src)
}
