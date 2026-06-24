import type { ChildGender, ParentGender } from './memberGender'

/** Ab diesem Alter dürfen Kinder standardmäßig Admin sein. */
export const ADMIN_AGE_THRESHOLD = 18

/** Eltern (Papa/Mama): Admin standardmäßig ein. */
export function defaultCanAdminForParent(_gender?: ParentGender): boolean {
  return true
}

/** Kinder (Junge/Mädchen): Admin ab 18, darunter aus. Ohne Alter: aus. */
export function defaultCanAdminForChild(age: number | null | undefined): boolean {
  if (age === null || age === undefined || !Number.isFinite(age)) return false
  return Math.floor(age) >= ADMIN_AGE_THRESHOLD
}

export function resolveCanAdmin(stored: unknown, fallback: boolean): boolean {
  if (typeof stored === 'boolean') return stored
  return fallback
}

export function canAdminForParentProfile(gender: ParentGender, storedCanAdmin: unknown): boolean {
  return resolveCanAdmin(storedCanAdmin, defaultCanAdminForParent(gender))
}

export function canAdminForChildProfile(
  gender: ChildGender,
  age: number | null,
  storedCanAdmin: unknown,
): boolean {
  void gender
  return resolveCanAdmin(storedCanAdmin, defaultCanAdminForChild(age))
}

export function sessionHasAdminAccess(
  memberKind: 'parent' | 'child',
  profileCanAdmin: boolean,
  isFamilyParent = false,
): boolean {
  if (!profileCanAdmin) return false
  if (memberKind === 'child') return true
  return isFamilyParent && profileCanAdmin
}
