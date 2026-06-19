/** Erhöhen bei neuen Avatar-Dateien — erzwingt frisches Laden. */
export const AVATAR_ASSET_VERSION = 7

/** Kanonischer Avatar-Pfad unter /public/avatars/ (immer .webp). */
export function normalizeAvatarSrc(src: string): string {
  const base = src.split('?')[0] ?? src
  if (!base.startsWith('/avatars/')) return base
  if (base.endsWith('.webp')) return base
  if (base.endsWith('.png')) return base.replace(/\.png$/i, '.webp')
  return `${base}.webp`
}

/** @deprecated Alias — nutze `normalizeAvatarSrc`. */
export const normalizeAvatarPngSrc = normalizeAvatarSrc

export function withAvatarCacheBust(src: string): string {
  return `${normalizeAvatarSrc(src)}?v=${AVATAR_ASSET_VERSION}`
}

export function resolveAvatarAssetUrl(src: string): { src: string; busted: string } {
  const normalized = normalizeAvatarSrc(src)
  return { src: normalized, busted: withAvatarCacheBust(normalized) }
}

/** @deprecated Nutze `resolveAvatarAssetUrl`. */
export function resolveAvatarAssetUrls(src: string): {
  png: string
  webp: string
  pngBusted: string
  webpBusted: string
} {
  const { src: webp, busted } = resolveAvatarAssetUrl(src)
  return { png: webp, webp, pngBusted: busted, webpBusted: busted }
}

function preloadUrl(url: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(`Avatar konnte nicht geladen werden: ${url}`))
    img.src = url
  })
}

const preloadedUrls = new Set<string>()

export async function preloadAvatarAsset(src: string): Promise<void> {
  const { busted } = resolveAvatarAssetUrl(src)
  if (preloadedUrls.has(busted)) return
  await preloadUrl(busted)
  preloadedUrls.add(busted)
}

export function clearAvatarAssetPreloadCache(): void {
  preloadedUrls.clear()
}
