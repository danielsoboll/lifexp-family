import {
  clearBridgedStorage,
  loadBridgedStorage,
  saveBridgedStorage,
} from './lifeexpCookie'

export const THEME_STORAGE_KEY = 'lifexp-theme'
const THEME_COOKIE_KEY = 'lifexp_t'

/** Fallback auf html — sichtbar bevor CSS lädt (iOS/PWA). */
export const THEME_FALLBACK_BG_LIGHT = '#64748b'
export const THEME_FALLBACK_BG_DARK = '#0f172a'

export type ThemePreference = 'light' | 'dark'

export function getStoredTheme(): ThemePreference | null {
  if (typeof window === 'undefined') return null
  try {
    const v = loadBridgedStorage(THEME_STORAGE_KEY, THEME_COOKIE_KEY)
    if (v === 'light' || v === 'dark') return v
    return null
  } catch {
    return null
  }
}

export function setStoredTheme(mode: ThemePreference) {
  if (typeof window === 'undefined') return
  try {
    saveBridgedStorage(THEME_STORAGE_KEY, THEME_COOKIE_KEY, mode)
  } catch {
    /* ignore */
  }
}

export function clearStoredTheme() {
  if (typeof window === 'undefined') return
  clearBridgedStorage(THEME_STORAGE_KEY, THEME_COOKIE_KEY)
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
