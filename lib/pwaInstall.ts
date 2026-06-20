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
/** Vollbild-Overlay nach Login — im Family-MVP optional. */
export const PWA_INSTALL_OVERLAY_ENABLED = false

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null
let listenerAttached = false

export function loadHomeScreenIconPreference(): HomeScreenIconPreference | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(PREFERENCE_KEY)?.trim().toLowerCase()
  return raw === 'yes' || raw === 'no' ? raw : null
}

export function saveHomeScreenIconPreference(value: HomeScreenIconPreference): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PREFERENCE_KEY, value)
}

export function savePwaInstallLater(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PWA_INSTALL_LATER_KEY, '1')
}

export function hasPwaInstallLater(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(PWA_INSTALL_LATER_KEY) === '1'
}

export function clearPwaInstallLater(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PWA_INSTALL_LATER_KEY)
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

export function shouldOfferPwaInstall(): boolean {
  if (typeof window === 'undefined') return false
  if (!PWA_INSTALL_OVERLAY_ENABLED) return false
  if (isStandaloneDisplayMode()) return false
  if (hasPwaInstallLater()) return false
  return true
}
