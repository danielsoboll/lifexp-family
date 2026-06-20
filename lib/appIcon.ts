/** Quelle für Homescreen-Icons (Happy_all-Familienportrait). */
export const APP_ICON_SOURCE = '/avatars/Happy_all.webp'

/** Cache-Bust nach Icon-Wechsel — Safari cached apple-touch-icon hartnäckig. */
export const APP_ICON_VERSION = 'happy-all-1'

const APP_ICON_FILES = {
  180: '/icon-180.png',
  192: '/icon-192.png',
  512: '/icon-512.png',
} as const

export const APP_ICON_PATHS = {
  180: `${APP_ICON_FILES[180]}?v=${APP_ICON_VERSION}`,
  192: `${APP_ICON_FILES[192]}?v=${APP_ICON_VERSION}`,
  512: `${APP_ICON_FILES[512]}?v=${APP_ICON_VERSION}`,
} as const

export const APP_MANIFEST_PATH = `/manifest.webmanifest?v=${APP_ICON_VERSION}`

export function getAppIconPath(size: 180 | 192 | 512 = 192): string {
  return APP_ICON_PATHS[size]
}

export function getAppManifestPath(): string {
  return APP_MANIFEST_PATH
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
export function applyAppIcons(): void {
  if (typeof document === 'undefined') return

  const icon180 = APP_ICON_PATHS[180]
  const icon192 = APP_ICON_PATHS[192]
  const icon512 = APP_ICON_PATHS[512]

  upsertHeadLink('manifest', APP_MANIFEST_PATH)
  upsertHeadLink('icon', icon192, { sizes: '192x192', type: 'image/png' })
  upsertHeadLink('apple-touch-icon', icon180, { sizes: '180x180' })
  upsertHeadLink('apple-touch-icon-precomposed', icon180, { sizes: '180x180' })

  const existing512 = document.querySelector<HTMLLinkElement>('link[rel="icon"][sizes="512x512"]')
  if (existing512) {
    existing512.href = icon512
  } else {
    upsertHeadLink('icon', icon512, { sizes: '512x512', type: 'image/png' })
  }
}
