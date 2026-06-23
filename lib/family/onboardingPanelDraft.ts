import type { OnboardingMemberGender } from './onboardingMember'
import type { AvatarPortraitId } from './memberAvatar'
import type { FamilySession } from '../familySession'
import { flushOnboardingBridge } from './onboardingBridge'
import { loadFamilyOnboardingDraft } from './onboardingDraft'

export type OnboardingFormSnapshot = {
  displayName: string
  gender: OnboardingMemberGender
  portraitId: AvatarPortraitId | null
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
    familyName: readInputValue('lifexp-create-family-title', fallback.familyName),
    displayName: readInputValue('lifexp-onboarding-who', fallback.displayName),
    gender: fallback.gender,
    portraitId: fallback.portraitId,
  }
}

export function readJoinFormSnapshot(fallback: JoinFormSnapshot): JoinFormSnapshot {
  return {
    inviteCode: readInputValue('join-invite-code', fallback.inviteCode),
    displayName: readInputValue('lifexp-onboarding-who', fallback.displayName),
    gender: fallback.gender,
    portraitId: fallback.portraitId,
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
