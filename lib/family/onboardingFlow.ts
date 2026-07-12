import { hasIncompleteFamilyOnboardingDraft, loadFamilyOnboardingDraft } from './onboardingDraft'

/** Willkommens-Sheet / Create- oder Join-Panel ist sichtbar — kein globaler PWA-Hinweis. */
export const ONBOARDING_UI_ACTIVE_EVENT = 'lifexp-onboarding-ui-active'

export function notifyOnboardingUiActive(active: boolean): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(ONBOARDING_UI_ACTIVE_EVENT, { detail: { active } }))
}

export function isOnboardingUiMarkedActive(): boolean {
  if (typeof window === 'undefined') return false
  return window.__lifexpOnboardingUiActive === true
}

export function markOnboardingUiActive(active: boolean): void {
  if (typeof window === 'undefined') return
  window.__lifexpOnboardingUiActive = active
  notifyOnboardingUiActive(active)
}

export function isOnboardingFlowActive(): boolean {
  if (hasIncompleteFamilyOnboardingDraft()) return true
  const draft = loadFamilyOnboardingDraft()
  if (draft?.incomplete) return true
  if (isOnboardingUiMarkedActive()) return true
  return false
}

declare global {
  interface Window {
    __lifexpOnboardingUiActive?: boolean
  }
}
