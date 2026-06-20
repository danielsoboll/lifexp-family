export type ParentGender = 'male' | 'female' | 'opa' | 'oma'
export type ChildGender = 'boy' | 'girl'

export const PARENT_GENDER_OPTIONS: { value: ParentGender; label: string }[] = [
  { value: 'male', label: 'Papa' },
  { value: 'female', label: 'Mama' },
  { value: 'opa', label: 'Opa' },
  { value: 'oma', label: 'Oma' },
]

export const CHILD_GENDER_OPTIONS: { value: ChildGender; label: string }[] = [
  { value: 'boy', label: 'Junge' },
  { value: 'girl', label: 'Mädchen' },
]

export function normalizeParentGender(value: unknown, fallback: ParentGender = 'male'): ParentGender {
  if (value === 'oma') return 'oma'
  if (value === 'opa') return 'opa'
  if (value === 'female') return 'female'
  if (value === 'male') return 'male'
  return fallback
}

export function isParentGender(value: unknown): value is ParentGender {
  return value === 'male' || value === 'female' || value === 'opa' || value === 'oma'
}

export function normalizeChildGender(value: unknown, avatarKey?: string | null, fallback: ChildGender = 'boy'): ChildGender {
  if (value === 'girl' || value === 'boy') return value
  if (avatarKey === 'girl' || avatarKey === 'female') return 'girl'
  if (avatarKey === 'boy' || avatarKey === 'male') return 'boy'
  return fallback
}

export function childGenderToAvatarKey(gender: ChildGender): string {
  return gender
}

export function formatChildAge(age: number | null | undefined): string | null {
  if (age === null || age === undefined || !Number.isFinite(age)) return null
  return `${Math.floor(age)} Jahre`
}

export function parseAgeInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const parsed = parseInt(trimmed, 10)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 99) return null
  return parsed
}

export function childMemberSubtitle(age: number | null, todayXp: number): string {
  const ageLabel = formatChildAge(age)
  const xpLabel = `+${todayXp} XP heute`
  return ageLabel ? `${ageLabel} · ${xpLabel}` : xpLabel
}

/** @deprecated Nur noch für Legacy-AvatarCard */
export function childGenderForAvatar(gender: ChildGender): 'male' | 'female' {
  return gender === 'girl' ? 'female' : 'male'
}

export function parentRoleLabel(gender: ParentGender): string {
  switch (gender) {
    case 'male':
      return 'Papa'
    case 'female':
      return 'Mama'
    case 'opa':
      return 'Opa'
    case 'oma':
      return 'Oma'
  }
}
