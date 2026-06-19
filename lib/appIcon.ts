import type { AvatarGender } from './avatarLibrary'
import { loadCachedAvatarGender } from './avatarDisplayCache'
import { loadOnboardingDraft } from './onboardingDraft'

export const APP_ICON_CROP_CENTER_FRACTION = 0.6

export const APP_ICON_SOURCES: Record<AvatarGender, string> = {
  male: '/avatars/Avatar_1_level1_1_Park.webp',
  female: '/avatars/Avatar_2_level1_4_park.webp',
}

export function getAppIconPath(gender: AvatarGender, size: 180 | 192 | 512 = 192): string {
  if (gender === 'female') {
    return `/icon-female-${size}.png`
  }
  return `/icon-${size}.png`
}

export function getAppManifestPath(gender: AvatarGender): string {
  return `/manifest-${gender}.webmanifest`
}

export function resolveAppIconGender(preferred?: AvatarGender | null): AvatarGender {
  if (preferred) return preferred
  const draft = loadOnboardingDraft()
  if (draft?.avatarGender) return draft.avatarGender
  return loadCachedAvatarGender()
}

function upsertHeadLink(rel: string, href: string, attrs: Record<string, string> = {}): void {
  if (typeof document === 'undefined') return
  const selector = rel === 'manifest' ? 'link[rel="manifest"]' : `link[rel="${rel}"]`
  let link = document.querySelector<HTMLLinkElement>(selector)
  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    document.head.appendChild(link)
  }
  link.href = href
  for (const [key, value] of Object.entries(attrs)) {
    link.setAttribute(key, value)
  }
}

/** Manifest + Favicon für Homescreen-Installation (Safari nutzt apple-touch-icon). */
export function applyAppIcons(gender: AvatarGender): void {
  if (typeof document === 'undefined') return

  const icon180 = getAppIconPath(gender, 180)
  const icon192 = getAppIconPath(gender, 192)
  const icon512 = getAppIconPath(gender, 512)

  upsertHeadLink('manifest', getAppManifestPath(gender))
  upsertHeadLink('icon', icon192, { sizes: '192x192', type: 'image/png' })
  upsertHeadLink('apple-touch-icon', icon180, { sizes: '180x180' })

  const existing512 = document.querySelector<HTMLLinkElement>('link[rel="icon"][sizes="512x512"]')
  if (existing512) {
    existing512.href = icon512
  } else {
    upsertHeadLink('icon', icon512, { sizes: '512x512', type: 'image/png' })
  }
}
