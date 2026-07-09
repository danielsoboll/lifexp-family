const LOCAL_DEV_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export function isLocalDevHost(hostname: string): boolean {
  return LOCAL_DEV_HOSTS.has(hostname.trim().toLowerCase())
}

export function isLocalDevClient(): boolean {
  if (typeof window === 'undefined') return false
  return isLocalDevHost(window.location.hostname)
}

/** Produktion: unverändert. Localhost: *_dev — getrennt von family.life-xp.de und alten Keys. */
export function scopeClientStorageKey(baseKey: string): string {
  if (typeof window === 'undefined') return baseKey
  if (!isLocalDevHost(window.location.hostname)) return baseKey
  if (baseKey.endsWith('_dev')) return baseKey
  return `${baseKey}_dev`
}

export function matchesScopedClientStorageKey(key: string, baseKey: string): boolean {
  return key === baseKey || key === `${baseKey}_dev`
}

export function isScopedLifeexpClientKey(key: string): boolean {
  if (key === 'points') return true
  if (!key.startsWith('lifexp') && !key.startsWith('lifexp-') && !key.startsWith('lifexp_')) return false
  if (!isLocalDevClient()) return !key.endsWith('_dev')
  return true
}

/** Inline vor React — gleiche Logik wie scopeClientStorageKey. */
export const CLIENT_STORAGE_SCOPE_INLINE = `
function lifexpScopedKey(k){
  var h=location.hostname.toLowerCase();
  if(h==="localhost"||h==="127.0.0.1"||h==="[::1]")return k+"_dev";
  return k;
}
`
