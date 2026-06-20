import {
  bootstrapClientStorageFromCookies,
  mirrorBridgedStorageToCookies,
} from '../clientStorageBootstrap'
import type { FamilyOnboardingDraft } from './onboardingDraft'
import { saveFamilyOnboardingDraft } from './onboardingDraft'

/** Wie LifeXP: erst speichern wenn Onboarding wirklich begonnen wurde. */
export function persistFamilyOnboardingDraft(draft: FamilyOnboardingDraft): void {
  if (!draft.hasStarted) return
  saveFamilyOnboardingDraft(draft)
}

export function flushOnboardingBridge(): void {
  mirrorBridgedStorageToCookies()
}

export function bootstrapOnboardingBridge(): void {
  bootstrapClientStorageFromCookies()
}

export function attachOnboardingBridgeFlushListeners(): () => void {
  const flush = () => flushOnboardingBridge()

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') flush()
  }

  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    window.removeEventListener('pagehide', flush)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}

export function attachOnboardingResumeListeners(onResume: () => void): () => void {
  const handler = () => {
    if (document.visibilityState === 'hidden') return
    bootstrapOnboardingBridge()
    onResume()
  }

  window.addEventListener('pageshow', handler)
  document.addEventListener('visibilitychange', handler)
  return () => {
    window.removeEventListener('pageshow', handler)
    document.removeEventListener('visibilitychange', handler)
  }
}
