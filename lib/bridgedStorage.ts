const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400

function cookieSecureSuffix(): string {
  if (typeof window === 'undefined') return ''
  return window.location.protocol === 'https:' ? '; Secure' : ''
}

export function setBridgedCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax${cookieSecureSuffix()}`
}

export function getBridgedCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const prefix = `${name}=`
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length))
    }
  }
  return null
}

export function clearBridgedCookie(name: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; path=/; max-age=0${cookieSecureSuffix()}`
}

/** localStorage + Cookie — überlebt Wechsel Browser ↔ Home-Bildschirm-App (iOS). */
export function saveBridgedStorage(localKey: string, cookieKey: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(localKey, value)
  } catch {
    /* privater Modus — Cookie als Fallback */
  }
  setBridgedCookie(cookieKey, value)
}

export function loadBridgedStorage(localKey: string, cookieKey: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const fromLocal = localStorage.getItem(localKey)
    if (fromLocal !== null && fromLocal !== '') return fromLocal
  } catch {
    /* ignore */
  }
  const fromCookie = getBridgedCookie(cookieKey)
  if (fromCookie !== null && fromCookie !== '') {
    try {
      localStorage.setItem(localKey, fromCookie)
    } catch {
      /* ignore */
    }
    return fromCookie
  }
  return null
}

export function clearBridgedStorage(localKey: string, cookieKey: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(localKey)
  } catch {
    /* ignore */
  }
  clearBridgedCookie(cookieKey)
}
