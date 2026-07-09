import { scopeClientStorageKey } from './clientStorageScope'
import { scopedLocalGet, scopedLocalRemove, scopedLocalSet } from './scopedClientStorage'

export const THEME_STORAGE_KEY = 'lifexp-theme'
const THEME_COOKIE_KEY = 'lifexp_t'

/** Fallback auf html — sichtbar bevor CSS lädt (iOS/PWA). */
export const THEME_FALLBACK_BG_LIGHT = '#64748b'
export const THEME_FALLBACK_BG_DARK = '#0f172a'

export type ThemePreference = 'light' | 'dark'

function readThemeCookie(): string | null {
  if (typeof document === 'undefined') return null
  const cookieKey = scopeClientStorageKey(THEME_COOKIE_KEY)
  const prefix = `${cookieKey}=`
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length))
    }
  }
  return null
}

function writeThemeCookie(value: ThemePreference): void {
  if (typeof document === 'undefined') return
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  const cookieKey = scopeClientStorageKey(THEME_COOKIE_KEY)
  document.cookie = `${cookieKey}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 400}; SameSite=Lax${secure}`
}

function clearThemeCookie(): void {
  if (typeof document === 'undefined') return
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  const cookieKey = scopeClientStorageKey(THEME_COOKIE_KEY)
  document.cookie = `${cookieKey}=; path=/; max-age=0${secure}`
}

export function getStoredTheme(): ThemePreference | null {
  if (typeof window === 'undefined') return null
  try {
    const fromStorage = scopedLocalGet(THEME_STORAGE_KEY)
    if (fromStorage === 'light' || fromStorage === 'dark') return fromStorage
    const fromCookie = readThemeCookie()
    if (fromCookie === 'light' || fromCookie === 'dark') {
      scopedLocalSet(THEME_STORAGE_KEY, fromCookie)
      return fromCookie
    }
    return null
  } catch {
    return null
  }
}

export function setStoredTheme(mode: ThemePreference) {
  if (typeof window === 'undefined') return
  try {
    scopedLocalSet(THEME_STORAGE_KEY, mode)
    writeThemeCookie(mode)
  } catch {
    /* ignore */
  }
}

export function clearStoredTheme() {
  if (typeof window === 'undefined') return
  try {
    scopedLocalRemove(THEME_STORAGE_KEY)
  } catch {
    /* ignore */
  }
  clearThemeCookie()
}

export function applyDarkClass(dark: boolean) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.backgroundColor = dark
    ? THEME_FALLBACK_BG_DARK
    : THEME_FALLBACK_BG_LIGHT
}

/** Soll die Seite initial im Dark Mode sein? (localStorage oder System) */
export function resolveInitialDark(): boolean {
  if (typeof window === 'undefined') return false
  const stored = getStoredTheme()
  if (stored === 'dark') return true
  if (stored === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}
