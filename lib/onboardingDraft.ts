import type { PrimaryGoal } from './goals'
import { clearBridgedStorage, loadBridgedStorage, saveBridgedStorage } from './lifeexpCookie'
import type { AvatarGender } from './avatarLibrary'

const DRAFT_LOCAL_KEY = 'lifexp_onboarding_draft'
const DRAFT_COOKIE_KEY = 'lifexp_od'

export type OnboardingDraft = {
  version: 1
  incomplete: true
  hasStarted: boolean
  stepIndex: number
  username: string
  age: string
  gender: 'male' | 'female' | 'divers' | null
  avatarGender: AvatarGender | null
  heightCm: string
  weightKg: string
  goalType: PrimaryGoal
  onboardingPwaInstallAcknowledged: boolean
  usernameValidated: boolean
}

function parseDraft(raw: string): OnboardingDraft | null {
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>
    if (parsed.version !== 1 || parsed.incomplete !== true) return null
    if (typeof parsed.hasStarted !== 'boolean') return null
    if (typeof parsed.stepIndex !== 'number') return null
    return {
      version: 1,
      incomplete: true,
      hasStarted: parsed.hasStarted,
      stepIndex: parsed.stepIndex,
      username: typeof parsed.username === 'string' ? parsed.username : '',
      age: typeof parsed.age === 'string' ? parsed.age : '',
      gender:
        parsed.gender === 'male' || parsed.gender === 'female' || parsed.gender === 'divers'
          ? parsed.gender
          : null,
      avatarGender:
        parsed.avatarGender === 'male' || parsed.avatarGender === 'female'
          ? parsed.avatarGender
          : null,
      heightCm: typeof parsed.heightCm === 'string' ? parsed.heightCm : '',
      weightKg: typeof parsed.weightKg === 'string' ? parsed.weightKg : '',
      goalType:
        parsed.goalType === 'fit' ||
        parsed.goalType === 'pump' ||
        parsed.goalType === 'structure' ||
        parsed.goalType === 'goal'
          ? parsed.goalType
          : 'fit',
      onboardingPwaInstallAcknowledged: parsed.onboardingPwaInstallAcknowledged === true,
      usernameValidated: parsed.usernameValidated === true,
    }
  } catch {
    return null
  }
}

export function loadOnboardingDraft(): OnboardingDraft | null {
  const raw = loadBridgedStorage(DRAFT_LOCAL_KEY, DRAFT_COOKIE_KEY)
  if (!raw) return null
  return parseDraft(raw)
}

export function saveOnboardingDraft(draft: OnboardingDraft): void {
  saveBridgedStorage(DRAFT_LOCAL_KEY, DRAFT_COOKIE_KEY, JSON.stringify(draft))
}

export function clearOnboardingDraft(): void {
  clearBridgedStorage(DRAFT_LOCAL_KEY, DRAFT_COOKIE_KEY)
}

export function hasIncompleteOnboardingDraft(): boolean {
  return loadOnboardingDraft()?.incomplete === true
}
