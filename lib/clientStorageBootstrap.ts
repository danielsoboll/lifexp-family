import { getBridgedCookie, saveBridgedStorage } from './bridgedStorage'
import {
  FAMILY_ONBOARDING_DRAFT_COOKIE_KEY,
  FAMILY_ONBOARDING_DRAFT_LOCAL_KEY,
} from './family/onboardingDraft'
import {
  bootstrapFamilySessionFromCookie,
  mirrorFamilySessionToCookie,
} from './familySession'
import { THEME_STORAGE_KEY } from './theme'

/** localStorage ↔ Cookie — Safari und Home-Bildschirm-App teilen Cookies zuverlässiger. */
export const BRIDGED_STORAGE_PAIRS = [
  { localKey: FAMILY_ONBOARDING_DRAFT_LOCAL_KEY, cookieKey: FAMILY_ONBOARDING_DRAFT_COOKIE_KEY },
  { localKey: THEME_STORAGE_KEY, cookieKey: 'lifexp_t' },
] as const

/** Cookies → localStorage, wenn die PWA leeren Speicher hat. */
export function bootstrapClientStorageFromCookies(): void {
  if (typeof window === 'undefined') return

  bootstrapFamilySessionFromCookie()

  for (const { localKey, cookieKey } of BRIDGED_STORAGE_PAIRS) {
    let fromLocal: string | null = null
    try {
      fromLocal = localStorage.getItem(localKey)
    } catch {
      /* ignore */
    }
    if (fromLocal !== null && fromLocal !== '') continue

    const fromCookie = getBridgedCookie(cookieKey)
    if (fromCookie !== null && fromCookie !== '') {
      try {
        localStorage.setItem(localKey, fromCookie)
      } catch {
        /* localStorage voll/blockiert */
      }
    }
  }
}

/** localStorage ↔ Cookies angleichen (PWA-Neustart kann localStorage leeren). */
export function mirrorBridgedStorageToCookies(): void {
  if (typeof window === 'undefined') return

  mirrorFamilySessionToCookie()

  for (const { localKey, cookieKey } of BRIDGED_STORAGE_PAIRS) {
    let value: string | null = null
    try {
      value = localStorage.getItem(localKey)
    } catch {
      /* ignore */
    }
    if (value === null || value === '') {
      value = getBridgedCookie(cookieKey)
    }
    if (value !== null && value !== '') {
      saveBridgedStorage(localKey, cookieKey, value)
    }
  }
}

/** Inline vor React — Session/Draft ohne Flackern aus Cookies laden. */
export function clientStorageBootstrapScript(): string {
  const pairsJson = JSON.stringify(
    BRIDGED_STORAGE_PAIRS.map(({ localKey, cookieKey }) => [localKey, cookieKey]),
  )
  const familyIdKey = JSON.stringify('lifexp_family_id')
  const memberKindKey = JSON.stringify('lifexp_member_kind')
  const memberIdKey = JSON.stringify('lifexp_member_id')
  const parentIdKey = JSON.stringify('lifexp_parent_id')
  const sessionCookie = JSON.stringify('lifexp_fs')

  return `(function(){try{var pairs=${pairsJson};function gc(n){var p=n+"=";var c=document.cookie.split(";");for(var i=0;i<c.length;i++){var t=c[i].trim();if(t.indexOf(p)===0)return decodeURIComponent(t.slice(p.length));}return null;}function sc(n,v){document.cookie=n+"="+encodeURIComponent(v)+"; path=/; max-age="+(60*60*24*400)+"; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"");}function flush(){try{for(var j=0;j<pairs.length;j++){var lk=pairs[j][0],ck=pairs[j][1];var v=localStorage.getItem(lk);if(v!==null&&v!=="")sc(ck,v);}var fid=localStorage.getItem(${familyIdKey});var mid=localStorage.getItem(${memberIdKey});var mk=localStorage.getItem(${memberKindKey});if(fid&&mid&&(mk==="parent"||mk==="child"))sc(${sessionCookie},JSON.stringify({familyId:fid,memberId:mid,memberKind:mk}));}catch(e){}}for(var j=0;j<pairs.length;j++){var lk=pairs[j][0],ck=pairs[j][1];var cur=localStorage.getItem(lk);if(cur!==null&&cur!=="")continue;var v=gc(ck);if(v!==null&&v!=="")localStorage.setItem(lk,v);}var fid=localStorage.getItem(${familyIdKey});var mid=localStorage.getItem(${memberIdKey});var mk=localStorage.getItem(${memberKindKey});if(fid&&mid&&(mk==="parent"||mk==="child")){sc(${sessionCookie},JSON.stringify({familyId:fid,memberId:mid,memberKind:mk}));}else if(!fid){var fs=gc(${sessionCookie});if(fs){var s=JSON.parse(fs);if(s.familyId&&s.memberId&&(s.memberKind==="parent"||s.memberKind==="child")){localStorage.setItem(${familyIdKey},s.familyId);localStorage.setItem(${memberKindKey},s.memberKind);localStorage.setItem(${memberIdKey},s.memberId);if(s.memberKind==="parent")localStorage.setItem(${parentIdKey},s.memberId);else localStorage.removeItem(${parentIdKey});}}}window.addEventListener("pagehide",flush);document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")flush();});}catch(e){}})();`
}
