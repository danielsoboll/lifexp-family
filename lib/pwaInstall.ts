export type HomeScreenIconPreference = 'yes' | 'no'

export type PwaInstallResult =
  | 'installed'
  | 'dismissed'
  | 'already-installed'
  | 'ios-manual'
  | 'unavailable'

const PREFERENCE_KEY = 'lifexp_home_screen_icon'
export const PWA_INSTALL_LATER_KEY = 'lifexp-pwa-install-later'
export const LIFEXP_PWA_INSTALL_PROMPT_READY_EVENT = 'lifexp-pwa-install-prompt-ready'
/** Vollbild-Overlay nach Login — vorübergehend aus (Onboarding/Ziele reichen). */
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

/**
 * Onboarding „Erledigt!“ (iOS): aktiv, wenn die App als PWA läuft.
 * In Safari lässt sich „Zum Home-Bildschirm“ nicht prüfen — Button bleibt trotzdem klickbar.
 */
export function isIosPwaInstallConfirmEnabled(): boolean {
  if (!isIosDevice()) return true
  if (isStandaloneDisplayMode()) return true
  return true
}

export function isPwaInstallDetected(): boolean {
  return isStandaloneDisplayMode()
}

export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false
  return /android/i.test(window.navigator.userAgent)
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

export async function recordPwaInstallSuccess(): Promise<void> {
  saveHomeScreenIconPreference('yes')
  clearPwaInstallLater()
  const { getActiveUsername } = await import('./user')
  if (!getActiveUsername()) return
  const { updateCurrentProfileAppInstalled } = await import('./profile')
  await updateCurrentProfileAppInstalled(true)
}

/** „Später“ nach dem Onboarding — localStorage + optional `profiles.app_later`. */
export async function recordPwaInstallLaterChoice(options?: {
  persistToProfile?: boolean
}): Promise<void> {
  savePwaInstallLater()
  if (options?.persistToProfile === false) return
  const { getActiveUsername } = await import('./user')
  if (!getActiveUsername()) return
  const { updateCurrentProfileAppLater } = await import('./profile')
  await updateCurrentProfileAppLater(true)
}

/** Beim Login: `app_later` aus Supabase in localStorage spiegeln (neues Gerät). */
export async function syncPwaInstallLaterFromProfile(): Promise<void> {
  const { getActiveUsername } = await import('./user')
  if (!getActiveUsername()) return
  const { fetchCurrentProfile } = await import('./profile')
  const { settings } = await fetchCurrentProfile()
  if (settings.appLater) savePwaInstallLater()
}

export async function syncAppInstalledProfileIfStandalone(): Promise<void> {
  if (!isStandaloneDisplayMode()) return
  const { getActiveUsername } = await import('./user')
  if (!getActiveUsername()) return
  const { updateCurrentProfileAppInstalled } = await import('./profile')
  await updateCurrentProfileAppInstalled(true)
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
