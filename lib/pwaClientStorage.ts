import {
  bootstrapClientStorageFromCookies,
  mirrorBridgedStorageToCookies,
} from './clientStorageBootstrap'
import { loadFamilyOnboardingDraft, type FamilyOnboardingDraft } from './family/onboardingDraft'
import { hasFamilySession, readFamilySession } from './familySession'
import { isStandaloneDisplayMode } from './pwaInstall'

/** Cookies ↔ localStorage — vor jeder Session-Entscheidung (Safari ↔ Home-Bildschirm). */
export function bootstrapPwaClientStorage(): void {
  bootstrapClientStorageFromCookies()
  mirrorBridgedStorageToCookies()
}

export function flushPwaClientStorage(): void {
  mirrorBridgedStorageToCookies()
}

export type StandaloneOnboardingResume = {
  shouldOpenSheet: boolean
  sheetView: 'create' | 'join' | 'welcome'
  draft: FamilyOnboardingDraft | null
}

/** Standalone-PWA: Formular-Draft aus Browser übernehmen und Sheet öffnen. */
export function resolveStandaloneOnboardingResume(): StandaloneOnboardingResume {
  bootstrapPwaClientStorage()

  const draft = loadFamilyOnboardingDraft()
  if (!isStandaloneDisplayMode() || !draft?.incomplete || hasFamilySession()) {
    return { shouldOpenSheet: false, sheetView: 'welcome', draft }
  }

  if (draft.mode === 'create' || draft.mode === 'join') {
    return { shouldOpenSheet: true, sheetView: draft.mode, draft }
  }

  return { shouldOpenSheet: false, sheetView: 'welcome', draft }
}

export function hasRestorableClientSession(): boolean {
  bootstrapPwaClientStorage()
  return hasFamilySession()
}

export function readRestoredFamilySession() {
  bootstrapPwaClientStorage()
  return readFamilySession()
}
