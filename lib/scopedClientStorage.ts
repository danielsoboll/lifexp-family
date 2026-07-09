import { isScopedLifeexpClientKey, scopeClientStorageKey } from './clientStorageScope'

export function scopedLocalGet(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(scopeClientStorageKey(key))
  } catch {
    return null
  }
}

export function scopedLocalSet(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(scopeClientStorageKey(key), value)
  } catch {
    /* ignore */
  }
}

export function scopedLocalRemove(key: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(scopeClientStorageKey(key))
  } catch {
    /* ignore */
  }
}

export function scopedSessionGet(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(scopeClientStorageKey(key))
  } catch {
    return null
  }
}

export function scopedSessionSet(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(scopeClientStorageKey(key), value)
  } catch {
    /* ignore */
  }
}

export function scopedSessionRemove(key: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(scopeClientStorageKey(key))
  } catch {
    /* ignore */
  }
}

export function collectScopedLifeexpLocalKeys(): string[] {
  if (typeof window === 'undefined') return []
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key && isScopedLifeexpClientKey(key)) keys.push(key)
  }
  return keys
}

export function collectScopedLifeexpSessionKeys(): string[] {
  if (typeof window === 'undefined') return []
  const keys: string[] = []
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i)
    if (key?.startsWith('lifexp') && isScopedLifeexpClientKey(key)) keys.push(key)
  }
  return keys
}
