import type { ChildGender, ParentGender } from './memberGender'
import type { FamilySession } from '../familySession'

export type OnboardingMemberGender = ParentGender | ChildGender

export type OnboardingMemberProfile =
  | { memberKind: 'parent'; displayName: string; gender: ParentGender }
  | { memberKind: 'child'; displayName: string; gender: ChildGender; age: number }

export type OnboardingDevicePrefs = {
  appInstalled: boolean
  appLater: boolean
}

export type FamilyOnboardingResult = {
  session: FamilySession
  recoveryCode: string
}

export const ONBOARDING_MEMBER_OPTIONS: {
  value: OnboardingMemberGender
  label: string
}[] = [
  { value: 'male', label: 'Papa' },
  { value: 'female', label: 'Mama' },
  { value: 'opa', label: 'Opa' },
  { value: 'oma', label: 'Oma' },
  { value: 'boy', label: 'Kind (Junge)' },
  { value: 'girl', label: 'Kind (Mädchen)' },
]

export function isParentOnboardingGender(value: OnboardingMemberGender): value is ParentGender {
  return value === 'male' || value === 'female' || value === 'opa' || value === 'oma'
}

export const ADULT_MEMBER_OPTIONS = ONBOARDING_MEMBER_OPTIONS.filter((option) =>
  isParentOnboardingGender(option.value),
)

export const CHILD_MEMBER_OPTIONS = ONBOARDING_MEMBER_OPTIONS.filter(
  (option) => !isParentOnboardingGender(option.value),
)

export function onboardingProfileFromForm(input: {
  displayName: string
  gender: OnboardingMemberGender
  age: number | null
}): { profile: OnboardingMemberProfile | null; error: string | null } {
  const displayName = input.displayName.trim()
  if (!displayName) return { profile: null, error: 'Bitte deinen Namen eingeben.' }

  if (isParentOnboardingGender(input.gender)) {
    return {
      profile: { memberKind: 'parent', displayName, gender: input.gender },
      error: null,
    }
  }

  if (input.age === null) {
    return { profile: null, error: 'Bitte dein Alter eingeben (0–99).' }
  }

  return {
    profile: {
      memberKind: 'child',
      displayName,
      gender: input.gender,
      age: input.age,
    },
    error: null,
  }
}
