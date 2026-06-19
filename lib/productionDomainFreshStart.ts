import { BRIDGED_STORAGE_PAIRS } from './clientStorageBootstrap'
import { clearLifeexpCookie, getLifeexpCookie, setLifeexpCookie } from './lifeexpCookie'
import { THEME_STORAGE_KEY } from './theme'

/** Erster Besuch auf der Produktions-Domain abgeschlossen — kein erneutes Löschen. */
export const LIFEXP_PRODUCTION_DOMAIN_INITIALIZED_KEY = 'lifexp_life_xp_de_initialized'
const PRODUCTION_INITIALIZED_COOKIE = 'lifexp_lxd'

const PRODUCTION_HOSTS = new Set(['life-xp.de', 'www.life-xp.de'])

const PRESERVED_LOCAL_STORAGE_KEYS = new Set([
  LIFEXP_PRODUCTION_DOMAIN_INITIALIZED_KEY,
  THEME_STORAGE_KEY,
])

const PRESERVED_COOKIE_KEYS = new Set(['lifexp_t', PRODUCTION_INITIALIZED_COOKIE])

function isProductionHost(hostname: string): boolean {
  return PRODUCTION_HOSTS.has(hostname.trim().toLowerCase())
}

function hasProductionFreshStartMarker(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (localStorage.getItem(LIFEXP_PRODUCTION_DOMAIN_INITIALIZED_KEY) === '1') return true
  } catch {
    /* ignore */
  }
  return getLifeexpCookie(PRODUCTION_INITIALIZED_COOKIE) === '1'
}

function markProductionFreshStartComplete(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LIFEXP_PRODUCTION_DOMAIN_INITIALIZED_KEY, '1')
  } catch {
    /* ignore */
  }
  setLifeexpCookie(PRODUCTION_INITIALIZED_COOKIE, '1')
}

function clearLifeexpCookiesExceptPreserved(): void {
  if (typeof document === 'undefined') return
  for (const { cookieKey } of BRIDGED_STORAGE_PAIRS) {
    if (PRESERVED_COOKIE_KEYS.has(cookieKey)) continue
    clearLifeexpCookie(cookieKey)
  }
  clearLifeexpCookie(PRODUCTION_INITIALIZED_COOKIE)
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

/** Alle LifeXP-Daten im Browser löschen (Theme bleibt). */
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
 * Beim ersten Besuch auf life-xp.de: alten localStorage/Cookies leeren, dann Marker setzen.
 * @returns true wenn gerade zurückgesetzt wurde (→ Onboarding)
 */
export function runProductionDomainFreshStartIfNeeded(): boolean {
  if (typeof window === 'undefined') return false
  if (!isProductionHost(window.location.hostname)) return false
  if (hasProductionFreshStartMarker()) {
    markProductionFreshStartComplete()
    return false
  }

  clearLegacyLifeXpClientStorage()
  markProductionFreshStartComplete()
  return true
}

/** Inline vor React — muss vor Cookie-Bootstrap laufen. */
export function productionDomainFreshStartScript(): string {
  const hostsJson = JSON.stringify([...PRODUCTION_HOSTS])
  const markerKey = JSON.stringify(LIFEXP_PRODUCTION_DOMAIN_INITIALIZED_KEY)
  const markerCookie = JSON.stringify(PRODUCTION_INITIALIZED_COOKIE)
  const themeKey = JSON.stringify(THEME_STORAGE_KEY)
  const cookieKeysJson = JSON.stringify(
    BRIDGED_STORAGE_PAIRS.map(({ cookieKey }) => cookieKey).filter(
      (key) => key !== 'lifexp_t',
    ),
  )

  return `(function(){try{var hosts=new Set(${hostsJson});var host=location.hostname.toLowerCase();if(!hosts.has(host))return;var markerKey=${markerKey};var markerCookie=${markerCookie};var themeKey=${themeKey};function gc(n){var p=n+"=";var c=document.cookie.split(";");for(var i=0;i<c.length;i++){var t=c[i].trim();if(t.indexOf(p)===0)return decodeURIComponent(t.slice(p.length));}return null;}function cc(n){document.cookie=n+"=; path=/; max-age=0"+(location.protocol==="https:"?"; Secure":"");}if(localStorage.getItem(markerKey)==="1"||gc(markerCookie)==="1"){localStorage.setItem(markerKey,"1");document.cookie=markerCookie+"=1; path=/; max-age="+(60*60*24*400)+"; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"");return;}var lk=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(!k||k===markerKey||k===themeKey)continue;if(k.indexOf("lifexp")===0||k==="points")lk.push(k);}for(var j=0;j<lk.length;j++)localStorage.removeItem(lk[j]);var sk=[];for(var s=0;s<sessionStorage.length;s++){var skk=sessionStorage.key(s);if(skk&&skk.indexOf("lifexp")===0)sk.push(skk);}for(var t=0;t<sk.length;t++)sessionStorage.removeItem(sk[t]);var ck=${cookieKeysJson};for(var u=0;u<ck.length;u++)cc(ck[u]);cc(markerCookie);var parts=document.cookie.split(";");for(var v=0;v<parts.length;v++){var part=parts[v].trim();var eq=part.indexOf("=");if(eq<=0)continue;var name=part.slice(0,eq);if(name.indexOf("lifexp_")!==0||name==="lifexp_t")continue;cc(name);}localStorage.setItem(markerKey,"1");document.cookie=markerCookie+"=1; path=/; max-age="+(60*60*24*400)+"; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"");}catch(e){}})();`
}

export function isLifeXpProductionHost(hostname: string): boolean {
  return isProductionHost(hostname)
}
