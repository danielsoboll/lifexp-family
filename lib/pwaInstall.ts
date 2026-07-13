import { scopedLocalGet, scopedLocalRemove, scopedLocalSet, scopedSessionGet, scopedSessionRemove, scopedSessionSet } from './scopedClientStorage'
import { getLocalDateKey } from './cetDate'
import { hasIncompleteFamilyOnboardingDraft } from './family/onboardingDraft'
import { isOnboardingFlowActive } from './family/onboardingFlow'
import { resolveSetupGuideStep, setupGuideStateFromFamily } from './family/setupGuide'
import type { Family } from './family/types'
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
/** Wartezeit nach Assistent + eigenem Streak — erst dann Banner (pro Tab). */
export const PWA_TOP_BANNER_DELAY_MS = 180_000

/** Live-Builds ≤60s: nur post-onboarding — nicht für neue Voraussetzungen wiederverwenden. */
const PWA_TOP_BANNER_ELIGIBLE_LEGACY_KEY = 'lifexp-pwa-top-banner-eligible-at'
const PWA_TOP_BANNER_ELIGIBLE_KEY = 'lifexp-pwa-top-banner-eligible-v2'
const PWA_TOP_BANNER_MARK_SCHEMA = 2

type PwaTopBannerEligibleMark = {
  at: number
  streakDate: string
  schema: number
}

let pwaTopBannerStorageMigrated = false

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

  migratePwaTopBannerStorage()

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

export type PwaTopBannerContext = PwaPostOnboardingContext & {
  family?: Family | null
  memberId?: string | null
  canAdmin?: boolean
  parentCount?: number
  childCount?: number
  /** true = „Bin dabei!“ / Tages-Streak heute erledigt; null = noch unbekannt */
  ownStreakClaimedToday?: boolean | null
}

/** Einsteiger-Assistent abgeschlossen — kein offener Guide-Schritt mehr. */
export function isSetupGuideAssistantComplete(context: PwaTopBannerContext = {}): boolean {
  if (!context.family?.id) return false
  const state = setupGuideStateFromFamily(context.family)
  if (!state) return false
  if (state.finished) return true
  const step = resolveSetupGuideStep({
    state,
    parentCount: context.parentCount ?? 0,
    childCount: context.childCount ?? 0,
    canAdmin: context.canAdmin ?? false,
    memberId: context.memberId,
  })
  return step === null
}

/** Assistent fertig und eigener Tages-Streak erledigt. */
export function isPwaTopBannerPrerequisitesMet(context: PwaTopBannerContext = {}): boolean {
  if (!isPostOnboardingPwaPromptEligible(context)) return false
  if (!isSetupGuideAssistantComplete(context)) return false
  if (context.ownStreakClaimedToday !== true) return false
  return true
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

export function shouldShowPwaInstallTopBanner(context: PwaTopBannerContext = {}): boolean {
  if (typeof window === 'undefined') return false
  if (!PWA_INSTALL_TOP_BANNER_ENABLED) return false
  if (loadHomeScreenIconPreference() === 'yes') return false
  if (hasPwaInstallLater()) return false
  if (!isPwaTopBannerPrerequisitesMet(context)) return false
  if (!shouldShowPwaInstallPromo()) return false
  if (!isPwaTopBannerDelayElapsed()) return false
  return true
}

/** Alte Timer-Marks (localStorage/sessionStorage) von früheren Builds entfernen. */
export function migratePwaTopBannerStorage(): void {
  if (typeof window === 'undefined') return
  if (pwaTopBannerStorageMigrated) return
  pwaTopBannerStorageMigrated = true

  scopedSessionRemove(PWA_TOP_BANNER_ELIGIBLE_LEGACY_KEY)
  scopedLocalRemove(PWA_TOP_BANNER_ELIGIBLE_LEGACY_KEY)

  const mark = readPwaTopBannerEligibleMarkRaw()
  if (!mark) return
  if (mark.schema !== PWA_TOP_BANNER_MARK_SCHEMA || mark.streakDate !== getLocalDateKey()) {
    clearPwaTopBannerEligibleMark()
  }
}

function readPwaTopBannerEligibleMarkRaw(): PwaTopBannerEligibleMark | null {
  const raw = scopedSessionGet(PWA_TOP_BANNER_ELIGIBLE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<PwaTopBannerEligibleMark>
    if (typeof parsed.at !== 'number' || !Number.isFinite(parsed.at)) return null
    if (typeof parsed.streakDate !== 'string' || !parsed.streakDate.trim()) return null
    if (parsed.schema !== PWA_TOP_BANNER_MARK_SCHEMA) return null
    return parsed as PwaTopBannerEligibleMark
  } catch {
    return null
  }
}

function readValidPwaTopBannerEligibleMark(): PwaTopBannerEligibleMark | null {
  migratePwaTopBannerStorage()
  const mark = readPwaTopBannerEligibleMarkRaw()
  if (!mark) return null
  if (mark.streakDate !== getLocalDateKey()) {
    clearPwaTopBannerEligibleMark()
    return null
  }
  return mark
}

/** Timer starten, wenn Voraussetzungen erfüllt; sonst zurücksetzen. */
export function syncPwaTopBannerEligibleMark(prerequisitesMet: boolean): void {
  if (typeof window === 'undefined') return
  if (!prerequisitesMet) {
    clearPwaTopBannerEligibleMark()
    return
  }
  markPwaTopBannerEligibleNow()
}

/** Startet die Wartezeit, wenn Assistent + Streak erfüllt (pro Tab, Streak-Tag). */
export function markPwaTopBannerEligibleNow(): void {
  if (typeof window === 'undefined') return
  migratePwaTopBannerStorage()
  if (readValidPwaTopBannerEligibleMark()) return

  const mark: PwaTopBannerEligibleMark = {
    at: Date.now(),
    streakDate: getLocalDateKey(),
    schema: PWA_TOP_BANNER_MARK_SCHEMA,
  }
  scopedSessionSet(PWA_TOP_BANNER_ELIGIBLE_KEY, JSON.stringify(mark))
}

export function getPwaTopBannerDelayRemainingMs(): number | null {
  if (typeof window === 'undefined') return null
  const mark = readValidPwaTopBannerEligibleMark()
  if (!mark) return null
  return Math.max(0, PWA_TOP_BANNER_DELAY_MS - (Date.now() - mark.at))
}

export function isPwaTopBannerDelayElapsed(): boolean {
  const remaining = getPwaTopBannerDelayRemainingMs()
  if (remaining === null) return false
  return remaining <= 0
}

export function clearPwaTopBannerEligibleMark(): void {
  if (typeof window === 'undefined') return
  scopedSessionRemove(PWA_TOP_BANNER_ELIGIBLE_KEY)
  scopedSessionRemove(PWA_TOP_BANNER_ELIGIBLE_LEGACY_KEY)
  scopedLocalRemove(PWA_TOP_BANNER_ELIGIBLE_LEGACY_KEY)
}

export function shouldOfferPwaInstall(appInstalled = false, context: PwaPostOnboardingContext = {}): boolean {
  if (typeof window === 'undefined') return false
  if (!PWA_INSTALL_OVERLAY_ENABLED) return false
  if (!isPostOnboardingPwaPromptEligible(context)) return false
  if (!shouldShowPwaInstallPromo(appInstalled)) return false
  if (hasPwaInstallLater()) return false
  return true
}
