import type { FamilySession } from '../familySession'
import { clearBridgedStorage, loadBridgedStorage, saveBridgedStorage } from '../bridgedStorage'
import type { OnboardingMemberGender } from './onboardingMember'

export const FAMILY_ONBOARDING_DRAFT_LOCAL_KEY = 'lifexp_family_onboarding_draft'
export const FAMILY_ONBOARDING_DRAFT_COOKIE_KEY = 'lifexp_fod'

export type CreateOnboardingStep = 'form' | 'install' | 'recovery'
export type JoinOnboardingStep = 'choice' | 'code' | 'scan' | 'confirm' | 'install' | 'recovery'

type DraftBase = {
  version: 1
  incomplete: true
  hasStarted: boolean
  displayName: string
  gender: OnboardingMemberGender
  ageInput: string
  portraitId?: string
  pwaInstallAcknowledged?: boolean
  recoveryCode?: string
  pendingSession?: FamilySession
}

export type FamilyOnboardingDraft =
  | (DraftBase & {
      mode: 'create'
      step: CreateOnboardingStep
      familyName: string
    })
  | (DraftBase & {
      mode: 'join'
      step: JoinOnboardingStep
      inviteCode: string
      /** Wie der Nutzer in den Join-Flow kam — für korrektes Zurück ab Install. */
      joinEntryPath?: 'code' | 'scan'
    })

function isMemberGender(value: unknown): value is OnboardingMemberGender {
  return (
    value === 'male' ||
    value === 'female' ||
    value === 'opa' ||
    value === 'oma' ||
    value === 'boy' ||
    value === 'girl'
  )
}

function parsePendingSession(value: unknown): FamilySession | undefined {
  if (!value || typeof value !== 'object') return undefined
  const row = value as Record<string, unknown>
  const familyId = typeof row.familyId === 'string' ? row.familyId : ''
  const memberId = typeof row.memberId === 'string' ? row.memberId : ''
  const memberKind = row.memberKind === 'parent' || row.memberKind === 'child' ? row.memberKind : null
  if (!familyId || !memberId || !memberKind) return undefined
  return { familyId, memberId, memberKind }
}

function inferHasStarted(parsed: Partial<FamilyOnboardingDraft>): boolean {
  if (parsed.hasStarted === true) return true
  if (parsed.pendingSession) return true
  if (typeof parsed.displayName === 'string' && parsed.displayName.trim()) return true
  if (typeof parsed.ageInput === 'string' && parsed.ageInput.trim()) return true
  if (parsed.mode === 'create' && typeof parsed.familyName === 'string' && parsed.familyName.trim()) return true
  if (parsed.mode === 'join' && typeof parsed.inviteCode === 'string' && parsed.inviteCode.trim()) return true
  if (parsed.step && parsed.step !== 'form' && parsed.step !== 'choice') return true
  return false
}

function parseDraft(raw: string): FamilyOnboardingDraft | null {
  try {
    const parsed = JSON.parse(raw) as Partial<FamilyOnboardingDraft>
    if (parsed.version !== 1 || parsed.incomplete !== true) return null
    if (typeof parsed.displayName !== 'string') return null
    if (!isMemberGender(parsed.gender)) return null
    if (typeof parsed.ageInput !== 'string') return null

    const hasStarted = inferHasStarted(parsed)
    if (!hasStarted) return null

    const base: DraftBase = {
      version: 1,
      incomplete: true,
      hasStarted: true,
      displayName: parsed.displayName,
      gender: parsed.gender,
      ageInput: parsed.ageInput,
      portraitId: typeof parsed.portraitId === 'string' ? parsed.portraitId : undefined,
      pwaInstallAcknowledged: parsed.pwaInstallAcknowledged === true,
      recoveryCode: typeof parsed.recoveryCode === 'string' ? parsed.recoveryCode : undefined,
      pendingSession: parsePendingSession(parsed.pendingSession),
    }

    if (parsed.mode === 'create' && typeof parsed.familyName === 'string') {
      const step =
        parsed.step === 'install' || parsed.step === 'recovery' || parsed.step === 'form'
          ? parsed.step
          : 'form'
      return { ...base, mode: 'create', step, familyName: parsed.familyName }
    }

    if (parsed.mode === 'join' && typeof parsed.inviteCode === 'string') {
      const step =
        parsed.step === 'choice' ||
        parsed.step === 'code' ||
        parsed.step === 'scan' ||
        parsed.step === 'confirm' ||
        parsed.step === 'install' ||
        parsed.step === 'recovery'
          ? parsed.step
          : 'choice'
      return { ...base, mode: 'join', step, inviteCode: parsed.inviteCode, joinEntryPath: parsed.joinEntryPath === 'scan' ? 'scan' : parsed.joinEntryPath === 'code' ? 'code' : undefined }
    }

    return null
  } catch {
    return null
  }
}

export function loadFamilyOnboardingDraft(): FamilyOnboardingDraft | null {
  const raw = loadBridgedStorage(FAMILY_ONBOARDING_DRAFT_LOCAL_KEY, FAMILY_ONBOARDING_DRAFT_COOKIE_KEY)
  if (!raw) return null
  return parseDraft(raw)
}

export function saveFamilyOnboardingDraft(draft: FamilyOnboardingDraft): void {
  saveBridgedStorage(
    FAMILY_ONBOARDING_DRAFT_LOCAL_KEY,
    FAMILY_ONBOARDING_DRAFT_COOKIE_KEY,
    JSON.stringify(draft),
  )
}

export function clearFamilyOnboardingDraft(): void {
  clearBridgedStorage(FAMILY_ONBOARDING_DRAFT_LOCAL_KEY, FAMILY_ONBOARDING_DRAFT_COOKIE_KEY)
}

export function hasIncompleteFamilyOnboardingDraft(): boolean {
  return loadFamilyOnboardingDraft()?.hasStarted === true
}

const CREATE_STEP_ORDER: CreateOnboardingStep[] = ['form', 'install', 'recovery']
const JOIN_STEP_ORDER: JoinOnboardingStep[] = ['choice', 'code', 'scan', 'confirm', 'install', 'recovery']

export function mergeOnboardingStep<T extends CreateOnboardingStep | JoinOnboardingStep>(
  current: T,
  restored: T,
  order: readonly T[],
): T {
  const currentIndex = order.indexOf(current)
  const restoredIndex = order.indexOf(restored)
  if (currentIndex < 0) return restored
  if (restoredIndex < 0) return current
  return order[Math.max(currentIndex, restoredIndex)] ?? restored
}

export function mergeCreateStep(current: CreateOnboardingStep, restored: CreateOnboardingStep): CreateOnboardingStep {
  return mergeOnboardingStep(current, restored, CREATE_STEP_ORDER)
}

export function mergeJoinStep(current: JoinOnboardingStep, restored: JoinOnboardingStep): JoinOnboardingStep {
  return mergeOnboardingStep(current, restored, JOIN_STEP_ORDER)
}

export function mergeCreateStepForwardOnly(
  current: CreateOnboardingStep,
  restored: CreateOnboardingStep,
): CreateOnboardingStep {
  const currentIndex = CREATE_STEP_ORDER.indexOf(current)
  const restoredIndex = CREATE_STEP_ORDER.indexOf(restored)
  if (currentIndex < 0) return restored
  if (restoredIndex < 0) return current
  return restoredIndex > currentIndex ? restored : current
}

/** Beim Resume aus Storage: nur vorwärts springen, absichtliches Zurück nicht überschreiben. */
export function mergeJoinStepForwardOnly(
  current: JoinOnboardingStep,
  restored: JoinOnboardingStep,
): JoinOnboardingStep {
  const currentIndex = JOIN_STEP_ORDER.indexOf(current)
  const restoredIndex = JOIN_STEP_ORDER.indexOf(restored)
  if (currentIndex < 0) return restored
  if (restoredIndex < 0) return current
  return restoredIndex > currentIndex ? restored : current
}
