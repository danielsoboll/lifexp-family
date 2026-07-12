import { scopedLocalGet, scopedLocalRemove, scopedLocalSet, scopedSessionGet, scopedSessionRemove, scopedSessionSet } from './scopedClientStorage'
import { hasIncompleteFamilyOnboardingDraft } from './family/onboardingDraft'
import { isOnboardingFlowActive } from './family/onboardingFlow'
import { hasFamilySession } from './familySession'

export type HomeScreenIconPreference = 'yes' | 'no'

export type PwaInstallResult =
  | 'installed'
  | 'dismissed'
  | 'already-installed'
  | 'ios-manual'
  | 'unavailable'

export type PwaInstallPlatform = 'android' | 'iphone' | 'ipad' | 'other'

const PREFERENCE_KEY = 'lifexp_home_screen_icon'
export const PWA_INSTALL_LATER_KEY = 'lifexp-pwa-install-later'
export const LIFEXP_PWA_INSTALL_PROMPT_READY_EVENT = 'lifexp-pwa-install-prompt-ready'
/** Vollbild-Overlay (deaktiviert — stattdessen Top-Banner). */
export const PWA_INSTALL_OVERLAY_ENABLED = false
/** Sticky-Hinweis oben: App auf den Home-Bildschirm, solange im Browser geöffnet. */
export const PWA_INSTALL_TOP_BANNER_ENABLED = true
/** Erst nach dieser Wartezeit post-onboarding anzeigen (pro Browser-Tab). */
export const PWA_TOP_BANNER_DELAY_MS = 60_000

const PWA_TOP_BANNER_ELIGIBLE_AT_KEY = 'lifexp-pwa-top-banner-eligible-at'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null
let listenerAttached = false

export function loadHomeScreenIconPreference(): HomeScreenIconPreference | null {
  if (typeof window === 'undefined') return null
  const raw = scopedLocalGet(PREFERENCE_KEY)?.trim().toLowerCase()
  return raw === 'yes' || raw === 'no' ? raw : null
}

export function saveHomeScreenIconPreference(value: HomeScreenIconPreference): void {
  if (typeof window === 'undefined') return
  scopedLocalSet(PREFERENCE_KEY, value)
}

export function savePwaInstallLater(): void {
  if (typeof window === 'undefined') return
  scopedLocalSet(PWA_INSTALL_LATER_KEY, '1')
}

export function hasPwaInstallLater(): boolean {
  if (typeof window === 'undefined') return false
  return scopedLocalGet(PWA_INSTALL_LATER_KEY) === '1'
}

export function clearPwaInstallLater(): void {
  if (typeof window === 'undefined') return
  scopedLocalRemove(PWA_INSTALL_LATER_KEY)
}

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIosPwaInstallConfirmEnabled(): boolean {
  if (!isIosDevice()) return true
  return isStandaloneDisplayMode() || true
}

export function isPwaInstallDetected(): boolean {
  return isStandaloneDisplayMode()
}

export function isIpadDevice(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  if (/ipad/i.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

export function isIphoneDevice(): boolean {
  if (typeof window === 'undefined') return false
  return /iphone|ipod/i.test(window.navigator.userAgent)
}

export function isIosDevice(): boolean {
  return isIphoneDevice() || isIpadDevice()
}

export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false
  return /android/i.test(window.navigator.userAgent)
}

export function getPwaInstallPlatform(): PwaInstallPlatform {
  if (isAndroidDevice()) return 'android'
  if (isIpadDevice()) return 'ipad'
  if (isIphoneDevice()) return 'iphone'
  return 'other'
}

export function canShowNativeInstallPrompt(): boolean {
  return deferredInstallPrompt !== null
}

function notifyInstallPromptReady(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(LIFEXP_PWA_INSTALL_PROMPT_READY_EVENT))
}

export function attachPwaInstallListener(): void {
  if (typeof window === 'undefined' || listenerAttached) return
  listenerAttached = true

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredInstallPrompt = event as BeforeInstallPromptEvent
    notifyInstallPromptReady()
  })

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null
    saveHomeScreenIconPreference('yes')
    clearPwaInstallLater()
    void recordPwaInstallSuccess()
  })
}

async function syncMemberAppInstalled(installed: boolean): Promise<void> {
  const { readFamilySession } = await import('./familySession')
  const { updateMemberAppInstalled } = await import('./family/memberSettings')
  const session = readFamilySession()
  if (!session) return
  await updateMemberAppInstalled(session.memberKind, session.memberId, installed)
}

async function syncMemberAppLater(later: boolean): Promise<void> {
  const { readFamilySession } = await import('./familySession')
  const { updateMemberAppLater } = await import('./family/memberSettings')
  const session = readFamilySession()
  if (!session) return
  await updateMemberAppLater(session.memberKind, session.memberId, later)
}

export async function recordPwaInstallSuccess(): Promise<void> {
  saveHomeScreenIconPreference('yes')
  clearPwaInstallLater()
  await syncMemberAppInstalled(true)
}

export async function recordPwaInstallLaterChoice(options?: {
  persistToProfile?: boolean
}): Promise<void> {
  savePwaInstallLater()
  if (options?.persistToProfile === false) return
  await syncMemberAppLater(true)
}

export async function syncPwaInstallLaterFromProfile(): Promise<void> {
  const { readFamilySession } = await import('./familySession')
  const { fetchMemberDeviceSettings } = await import('./family/memberSettings')
  const session = readFamilySession()
  if (!session) return
  const { appLater, error } = await fetchMemberDeviceSettings(session.memberKind, session.memberId)
  if (error) return
  if (appLater) savePwaInstallLater()
}

export async function syncAppInstalledProfileIfStandalone(): Promise<void> {
  if (!isStandaloneDisplayMode()) return
  await recordPwaInstallSuccess()
}

/** Bei jedem App-Start: Home-Bildschirm-App → Profil als installiert; Browser → nur Anzeige-Logik. */
export async function syncAppInstalledFromDisplayMode(): Promise<void> {
  if (isStandaloneDisplayMode()) {
    await recordPwaInstallSuccess()
  }
}

export async function requestPwaInstall(): Promise<PwaInstallResult> {
  if (typeof window === 'undefined') return 'unavailable'

  if (isStandaloneDisplayMode()) {
    await recordPwaInstallSuccess()
    return 'already-installed'
  }

  if (isIosDevice()) {
    return 'ios-manual'
  }

  if (!deferredInstallPrompt) {
    return 'unavailable'
  }

  try {
    await deferredInstallPrompt.prompt()
    const { outcome } = await deferredInstallPrompt.userChoice
    deferredInstallPrompt = null
    if (outcome === 'accepted') {
      await recordPwaInstallSuccess()
      return 'installed'
    }
    return 'dismissed'
  } catch {
    deferredInstallPrompt = null
    return 'unavailable'
  }
}

/** Home-Bildschirm-Hinweis: nur wenn nicht als installierte App geöffnet (Laufzeit-Check). */
export function shouldShowPwaInstallPromo(_appInstalled = false): boolean {
  if (typeof window === 'undefined') return false
  return !isStandaloneDisplayMode()
}

export type PwaPostOnboardingContext = {
  /** Familie aus FamilyProvider erfolgreich geladen */
  familyReady?: boolean
}

/** Globaler PWA-Hinweis nur nach abgeschlossenem Onboarding — nie auf Willkommen/Formular. */
export function isPostOnboardingPwaPromptEligible(context: PwaPostOnboardingContext = {}): boolean {
  if (typeof window === 'undefined') return false
  if (isOnboardingFlowActive()) return false
  if (!hasFamilySession()) return false
  if (hasIncompleteFamilyOnboardingDraft()) return false
  if (context.familyReady === false) return false
  return true
}

/** @deprecated Alias — bitte isPostOnboardingPwaPromptEligible verwenden. */
export function isPwaGlobalOverlayEligible(context: PwaPostOnboardingContext = {}): boolean {
  return isPostOnboardingPwaPromptEligible(context)
}

export function shouldShowPwaInstallTopBanner(context: PwaPostOnboardingContext = {}): boolean {
  if (typeof window === 'undefined') return false
  if (!PWA_INSTALL_TOP_BANNER_ENABLED) return false
  if (!isPostOnboardingPwaPromptEligible(context)) return false
  if (!shouldShowPwaInstallPromo()) return false
  if (!isPwaTopBannerDelayElapsed()) return false
  return true
}

/** Startet die Wartezeit beim ersten post-onboarding Besuch im Tab. */
export function markPwaTopBannerEligibleNow(): void {
  if (typeof window === 'undefined') return
  if (scopedSessionGet(PWA_TOP_BANNER_ELIGIBLE_AT_KEY)) return
  scopedSessionSet(PWA_TOP_BANNER_ELIGIBLE_AT_KEY, String(Date.now()))
}

export function getPwaTopBannerDelayRemainingMs(): number | null {
  if (typeof window === 'undefined') return null
  const raw = scopedSessionGet(PWA_TOP_BANNER_ELIGIBLE_AT_KEY)
  if (!raw) return null
  const eligibleAt = Number(raw)
  if (!Number.isFinite(eligibleAt)) return null
  return Math.max(0, PWA_TOP_BANNER_DELAY_MS - (Date.now() - eligibleAt))
}

export function isPwaTopBannerDelayElapsed(): boolean {
  const remaining = getPwaTopBannerDelayRemainingMs()
  if (remaining === null) return false
  return remaining <= 0
}

export function clearPwaTopBannerEligibleMark(): void {
  if (typeof window === 'undefined') return
  scopedSessionRemove(PWA_TOP_BANNER_ELIGIBLE_AT_KEY)
}

export function shouldOfferPwaInstall(appInstalled = false, context: PwaPostOnboardingContext = {}): boolean {
  if (typeof window === 'undefined') return false
  if (!PWA_INSTALL_OVERLAY_ENABLED) return false
  if (!isPostOnboardingPwaPromptEligible(context)) return false
  if (!shouldShowPwaInstallPromo(appInstalled)) return false
  if (hasPwaInstallLater()) return false
  return true
}
