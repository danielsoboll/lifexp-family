import type { OnboardingMemberGender } from './onboardingMember'
import type { FamilySession } from '../familySession'
import { flushOnboardingBridge } from './onboardingBridge'
import { loadFamilyOnboardingDraft } from './onboardingDraft'

export type OnboardingFormSnapshot = {
  displayName: string
  gender: OnboardingMemberGender
  ageInput: string
}

export type CreateFormSnapshot = OnboardingFormSnapshot & {
  familyName: string
}

export type JoinFormSnapshot = OnboardingFormSnapshot & {
  inviteCode: string
}

export function commitFocusedFormField(): void {
  if (typeof document === 'undefined') return
  const active = document.activeElement
  if (active instanceof HTMLElement) active.blur()
}

function readInputValue(id: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const el = document.getElementById(id)
  return el instanceof HTMLInputElement ? el.value : fallback
}

export function readCreateFormSnapshot(fallback: CreateFormSnapshot): CreateFormSnapshot {
  return {
    familyName: readInputValue('create-family-name', fallback.familyName),
    displayName: readInputValue('onboarding-name', fallback.displayName),
    gender: fallback.gender,
    ageInput: readInputValue('onboarding-age', fallback.ageInput),
  }
}

export function readJoinFormSnapshot(fallback: JoinFormSnapshot): JoinFormSnapshot {
  return {
    inviteCode: readInputValue('join-invite-code', fallback.inviteCode),
    displayName: readInputValue('onboarding-name', fallback.displayName),
    gender: fallback.gender,
    ageInput: readInputValue('onboarding-age', fallback.ageInput),
  }
}

export function resolveOnboardingPendingCredentials(
  pendingSession: FamilySession | null,
  recoveryCode: string,
): { session: FamilySession; recoveryCode: string } | null {
  if (pendingSession && recoveryCode) {
    return { session: pendingSession, recoveryCode }
  }

  const draft = loadFamilyOnboardingDraft()
  if (draft?.pendingSession && draft.recoveryCode) {
    return { session: draft.pendingSession, recoveryCode: draft.recoveryCode }
  }

  return null
}

export function deferFlushOnboardingBridge(): void {
  queueMicrotask(() => flushOnboardingBridge())
}
