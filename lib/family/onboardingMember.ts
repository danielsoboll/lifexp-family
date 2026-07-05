import {
  coerceOnboardingPortrait,
  coercePortraitForCategory,
  memberAvatarCategoryForChild,
  portraitSrc,
  type AvatarPortraitId,
} from './memberAvatar'
import { parseAgeInput, type ChildGender, type ParentGender } from './memberGender'
import type { FamilySession } from '../familySession'

export type OnboardingMemberGender = ParentGender | ChildGender

export type OnboardingMemberProfile =
  | { memberKind: 'parent'; displayName: string; gender: ParentGender; portraitId: AvatarPortraitId }
  | { memberKind: 'child'; displayName: string; gender: ChildGender; age: number | null; portraitId: AvatarPortraitId }

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

export function parentAvatarUrlForOnboarding(
  profile: Extract<OnboardingMemberProfile, { memberKind: 'parent' }>,
): string {
  return portraitSrc(coerceOnboardingPortrait(profile.gender, profile.portraitId))
}

export function childPortraitKeyForOnboarding(
  profile: Extract<OnboardingMemberProfile, { memberKind: 'child' }>,
): AvatarPortraitId {
  const category = memberAvatarCategoryForChild(profile.gender, profile.age)
  return coercePortraitForCategory(category, profile.portraitId) ?? profile.portraitId
}

export function onboardingProfileFromForm(input: {
  displayName: string
  gender: OnboardingMemberGender
  ageInput?: string
  portraitId: AvatarPortraitId | null
}): { profile: OnboardingMemberProfile | null; error: string | null } {
  const displayName = input.displayName.trim()
  if (!displayName) return { profile: null, error: 'Bitte deinen Namen eingeben.' }

  if (isParentOnboardingGender(input.gender)) {
    const portraitId = coerceOnboardingPortrait(input.gender, input.portraitId)
    return {
      profile: { memberKind: 'parent', displayName, gender: input.gender, portraitId },
      error: null,
    }
  }

  const age = parseAgeInput(input.ageInput ?? '')
  if (age === null) {
    return { profile: null, error: 'Bitte ein gültiges Alter (0–99) eingeben.' }
  }

  const category = memberAvatarCategoryForChild(input.gender, age)
  if (category === 'unavailable') {
    return { profile: null, error: 'Bitte ein Alter zwischen 2 und 99 eingeben.' }
  }

  const portraitId = coercePortraitForCategory(category, input.portraitId)
  if (!portraitId) {
    return { profile: null, error: 'Bitte ein Alter zwischen 2 und 99 eingeben.' }
  }

  return {
    profile: {
      memberKind: 'child',
      displayName,
      gender: input.gender,
      age,
      portraitId,
    },
    error: null,
  }
}
