import { getLifeexpCookie, saveBridgedStorage } from './lifeexpCookie'
import { THEME_STORAGE_KEY } from './theme'
import { LIFEXP_SESSION_ESTABLISHED_KEY, LIFEXP_USERNAME_KEY } from './user'

/** localStorage-Key ↔ kurzer Cookie-Name (Safari ↔ Home-Screen teilen Cookies zuverlässiger). */
export const BRIDGED_STORAGE_PAIRS = [
  { localKey: LIFEXP_USERNAME_KEY, cookieKey: 'lifexp_u' },
  { localKey: LIFEXP_SESSION_ESTABLISHED_KEY, cookieKey: 'lifexp_se' },
  { localKey: 'lifexp_week_plan_monday', cookieKey: 'lifexp_wpm' },
  { localKey: 'lifexp_onboarding_draft', cookieKey: 'lifexp_od' },
  { localKey: THEME_STORAGE_KEY, cookieKey: 'lifexp_t' },
] as const

/** Cookies → localStorage, wenn die PWA/Standalone leeren Speicher hat. */
export function bootstrapClientStorageFromCookies(): void {
  if (typeof window === 'undefined') return
  for (const { localKey, cookieKey } of BRIDGED_STORAGE_PAIRS) {
    const fromLocal = localStorage.getItem(localKey)
    if (fromLocal !== null && fromLocal !== '') continue
    const fromCookie = getLifeexpCookie(cookieKey)
    if (fromCookie !== null && fromCookie !== '') {
      try {
        localStorage.setItem(localKey, fromCookie)
      } catch {
        /* localStorage voll/blockiert — Cookie reicht für loadBridgedStorage */
      }
    }
  }
}

/** localStorage ↔ Cookies angleichen (PWA-Kill kann localStorage leeren). */
export function mirrorBridgedStorageToCookies(): void {
  if (typeof window === 'undefined') return
  for (const { localKey, cookieKey } of BRIDGED_STORAGE_PAIRS) {
    let value: string | null = null
    try {
      value = localStorage.getItem(localKey)
    } catch {
      /* ignore */
    }
    if (value === null || value === '') {
      value = getLifeexpCookie(cookieKey)
    }
    if (value !== null && value !== '') {
      saveBridgedStorage(localKey, cookieKey, value)
    }
  }
}

/** Inline vor React — Theme/Session ohne FOUC aus Cookies laden. */
export function clientStorageBootstrapScript(): string {
  const pairsJson = JSON.stringify(
    BRIDGED_STORAGE_PAIRS.map(({ localKey, cookieKey }) => [localKey, cookieKey]),
  )
  return `(function(){try{var pairs=${pairsJson};function gc(n){var p=n+"=";var c=document.cookie.split(";");for(var i=0;i<c.length;i++){var t=c[i].trim();if(t.indexOf(p)===0)return decodeURIComponent(t.slice(p.length));}return null;}for(var j=0;j<pairs.length;j++){var lk=pairs[j][0],ck=pairs[j][1];var cur=localStorage.getItem(lk);if(cur!==null&&cur!=="")continue;var v=gc(ck);if(v!==null&&v!=="")localStorage.setItem(lk,v);}}catch(e){}})();`
}
