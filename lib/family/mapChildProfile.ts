import { cetLocalYear } from '../cetDate'
import type { ChildProfile } from './types'
import { canAdminForChildProfile } from './memberAdmin'
import {
  defaultPortraitForChild,
  isPortraitId,
  portraitIdFromStored,
  portraitOptionsForChild,
  basePortraitOptionForOptions,
} from './memberAvatar'
import { normalizeMemberAccentKey } from './memberAccentColor'
import { normalizeChildGender } from './memberGender'

type ChildProfileRow = Record<string, unknown>

function numberValue(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value)
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function textValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function boolValue(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function resolveAge(row: ChildProfileRow): number | null {
  if (row.age !== null && row.age !== undefined) {
    const age = numberValue(row.age, NaN)
    return Number.isFinite(age) ? age : null
  }

  const birthYearRaw = row.birth_year
  if (birthYearRaw === null || birthYearRaw === undefined) return null
  const birthYear = numberValue(birthYearRaw, NaN)
  if (!Number.isFinite(birthYear)) return null
  return Math.max(0, cetLocalYear() - birthYear)
}

function resolvePortraitId(
  gender: ReturnType<typeof normalizeChildGender>,
  age: number | null,
  rawKey: string,
): string | null {
  if (age === null || age < 2) return null

  const options = portraitOptionsForChild(gender, age)
  const stored = portraitIdFromStored(rawKey)
  if (stored && isPortraitId(stored)) {
    const matched = basePortraitOptionForOptions(stored, options)
    if (matched) return matched
  }
  return defaultPortraitForChild(gender, age)
}

export function mapChildProfileRow(row: ChildProfileRow): ChildProfile | null {
  const id = textValue(row.id)
  const familyId = textValue(row.family_id)
  const displayName = textValue(row.display_name).trim()
  if (!id || !familyId || !displayName) return null

  const rawAvatarKey = textValue(row.avatar_key, '') || ''
  const gender = normalizeChildGender(row.gender, rawAvatarKey === 'boy' || rawAvatarKey === 'girl' ? rawAvatarKey : null)
  const age = resolveAge(row)
  const portrait_id = resolvePortraitId(gender, age, rawAvatarKey)

  return {
    id,
    family_id: familyId,
    display_name: displayName,
    gender,
    age,
    can_admin: canAdminForChildProfile(gender, age, row.can_admin),
    portrait_id,
    total_xp: Math.max(0, numberValue(row.total_xp)),
    level: Math.max(1, numberValue(row.level, 1)),
    is_active: boolValue(row.is_active, true),
    sort_order: numberValue(row.sort_order),
    notes: row.notes === null || row.notes === undefined ? null : textValue(row.notes),
    accent_key: normalizeMemberAccentKey(row.accent_key),
    rec_code: row.rec_code === null || row.rec_code === undefined ? null : textValue(row.rec_code),
    rec_code_ok: boolValue(row.rec_code_ok),
    app_installed: boolValue(row.app_installed),
    app_later: boolValue(row.app_later),
    streak_intro_seen: boolValue(row.streak_intro_seen),
    no_own_device: boolValue(row.no_own_device),
    created_at: textValue(row.created_at),
    updated_at: textValue(row.updated_at),
  }
}

export function mapChildProfileRows(rows: unknown): ChildProfile[] {
  if (!Array.isArray(rows)) return []
  return rows
    .map((row) => mapChildProfileRow(row as ChildProfileRow))
    .filter((row): row is ChildProfile => row !== null)
}
