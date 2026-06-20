import { FAMILY_SESSION_COOKIE_KEY } from './familySession'
import {
  FAMILY_ONBOARDING_DRAFT_COOKIE_KEY,
  FAMILY_ONBOARDING_DRAFT_LOCAL_KEY,
} from './family/onboardingDraft'
import { THEME_STORAGE_KEY } from './theme'

/** Erster Besuch auf der Family-Produktions-Domain abgeschlossen. */
export const LIFEXP_FAMILY_DOMAIN_INITIALIZED_KEY = 'lifexp_family_life_xp_de_initialized'
const FAMILY_INITIALIZED_COOKIE = 'lifexp_fxd'

const PRODUCTION_HOSTS = new Set(['family.life-xp.de', 'www.family.life-xp.de'])

const PRESERVED_LOCAL_STORAGE_KEYS = new Set([
  LIFEXP_FAMILY_DOMAIN_INITIALIZED_KEY,
  THEME_STORAGE_KEY,
  FAMILY_ONBOARDING_DRAFT_LOCAL_KEY,
])

const PRESERVED_COOKIE_KEYS = new Set([
  'lifexp_t',
  FAMILY_INITIALIZED_COOKIE,
  FAMILY_ONBOARDING_DRAFT_COOKIE_KEY,
  FAMILY_SESSION_COOKIE_KEY,
])

function isProductionHost(hostname: string): boolean {
  return PRODUCTION_HOSTS.has(hostname.trim().toLowerCase())
}

function getLifeexpCookie(name: string): string | null {
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

function setLifeexpCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 400}; SameSite=Lax${secure}`
}

function clearLifeexpCookie(name: string): void {
  if (typeof document === 'undefined') return
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=; path=/; max-age=0${secure}`
}

function hasProductionFreshStartMarker(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (localStorage.getItem(LIFEXP_FAMILY_DOMAIN_INITIALIZED_KEY) === '1') return true
  } catch {
    /* ignore */
  }
  return getLifeexpCookie(FAMILY_INITIALIZED_COOKIE) === '1'
}

function markProductionFreshStartComplete(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LIFEXP_FAMILY_DOMAIN_INITIALIZED_KEY, '1')
  } catch {
    /* ignore */
  }
  setLifeexpCookie(FAMILY_INITIALIZED_COOKIE, '1')
}

function clearLifeexpCookiesExceptPreserved(): void {
  if (typeof document === 'undefined') return
  clearLifeexpCookie(FAMILY_INITIALIZED_COOKIE)
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const name = trimmed.slice(0, eq)
    if (!name.startsWith('lifexp_')) continue
    if (PRESERVED_COOKIE_KEYS.has(name)) continue
    clearLifeexpCookie(name)
  }
}

/** Alle LifeXP-Solo-Daten im Browser löschen (Theme bleibt). */
export function clearLegacyLifeXpClientStorage(): void {
  if (typeof window === 'undefined') return

  const localKeys: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key) continue
    if (PRESERVED_LOCAL_STORAGE_KEYS.has(key)) continue
    if (key.startsWith('lifexp') || key === 'points') {
      localKeys.push(key)
    }
  }
  for (const key of localKeys) {
    localStorage.removeItem(key)
  }

  const sessionKeys: string[] = []
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i)
    if (key?.startsWith('lifexp')) sessionKeys.push(key)
  }
  for (const key of sessionKeys) {
    sessionStorage.removeItem(key)
  }

  clearLifeexpCookiesExceptPreserved()
}

/**
 * Beim ersten Besuch auf family.life-xp.de: alten localStorage/Cookies leeren, dann Marker setzen.
 */
export function runProductionDomainFreshStartIfNeeded(): boolean {
  if (typeof window === 'undefined') return false
  if (!isProductionHost(window.location.hostname)) return false
  if (hasProductionFreshStartMarker()) {
    markProductionFreshStartComplete()
    return false
  }

  const draftCookie = getLifeexpCookie(FAMILY_ONBOARDING_DRAFT_COOKIE_KEY)
  const sessionCookie = getLifeexpCookie(FAMILY_SESSION_COOKIE_KEY)
  if (draftCookie || sessionCookie) {
    markProductionFreshStartComplete()
    return false
  }

  clearLegacyLifeXpClientStorage()
  markProductionFreshStartComplete()
  return true
}

/** Inline vor React — muss vor anderen Client-Skripten laufen. */
export function productionDomainFreshStartScript(): string {
  const hostsJson = JSON.stringify([...PRODUCTION_HOSTS])
  const markerKey = JSON.stringify(LIFEXP_FAMILY_DOMAIN_INITIALIZED_KEY)
  const markerCookie = JSON.stringify(FAMILY_INITIALIZED_COOKIE)
  const themeKey = JSON.stringify(THEME_STORAGE_KEY)

  return `(function(){try{var hosts=new Set(${hostsJson});var host=location.hostname.toLowerCase();if(!hosts.has(host))return;var markerKey=${markerKey};var markerCookie=${markerCookie};var themeKey=${themeKey};var draftKey=${JSON.stringify(FAMILY_ONBOARDING_DRAFT_LOCAL_KEY)};var draftCookie=${JSON.stringify(FAMILY_ONBOARDING_DRAFT_COOKIE_KEY)};var sessionCookie=${JSON.stringify(FAMILY_SESSION_COOKIE_KEY)};function gc(n){var p=n+"=";var c=document.cookie.split(";");for(var i=0;i<c.length;i++){var t=c[i].trim();if(t.indexOf(p)===0)return decodeURIComponent(t.slice(p.length));}return null;}function cc(n){document.cookie=n+"=; path=/; max-age=0"+(location.protocol==="https:"?"; Secure":"");}function markDone(){localStorage.setItem(markerKey,"1");document.cookie=markerCookie+"=1; path=/; max-age="+(60*60*24*400)+"; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"");}if(localStorage.getItem(markerKey)==="1"||gc(markerCookie)==="1"){markDone();return;}if(gc(draftCookie)||gc(sessionCookie)){markDone();return;}var lk=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(!k||k===markerKey||k===themeKey||k===draftKey)continue;if(k.indexOf("lifexp")===0||k==="points")lk.push(k);}for(var j=0;j<lk.length;j++)localStorage.removeItem(lk[j]);var sk=[];for(var s=0;s<sessionStorage.length;s++){var skk=sessionStorage.key(s);if(skk&&skk.indexOf("lifexp")===0)sk.push(skk);}for(var t=0;t<sk.length;t++)sessionStorage.removeItem(sk[t]);var parts=document.cookie.split(";");for(var v=0;v<parts.length;v++){var part=parts[v].trim();var eq=part.indexOf("=");if(eq<=0)continue;var name=part.slice(0,eq);if(name.indexOf("lifexp_")!==0||name==="lifexp_t"||name===draftCookie||name===sessionCookie)continue;cc(name);}markDone();}catch(e){}})();`
}

export function isLifeXpProductionHost(hostname: string): boolean {
  return isProductionHost(hostname)
}
