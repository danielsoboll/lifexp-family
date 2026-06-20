import type { ParentProfile } from './types'
import { canAdminForParentProfile } from './memberAdmin'
import { normalizeMemberAccentKey } from './memberAccentColor'
import { normalizeParentGender } from './memberGender'

type ParentProfileRow = Record<string, unknown>

function textValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function boolValue(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function mapParentProfileRow(row: ParentProfileRow): ParentProfile | null {
  const id = textValue(row.id)
  const displayName = textValue(row.display_name).trim()
  if (!id || !displayName) return null

  const gender = normalizeParentGender(row.gender)

  return {
    id,
    display_name: displayName,
    gender,
    can_admin: canAdminForParentProfile(gender, row.can_admin),
    avatar_url: row.avatar_url === null || row.avatar_url === undefined ? null : textValue(row.avatar_url),
    accent_key: normalizeMemberAccentKey(row.accent_key),
    rec_code: row.rec_code === null || row.rec_code === undefined ? null : textValue(row.rec_code),
    rec_code_ok: boolValue(row.rec_code_ok),
    app_installed: boolValue(row.app_installed),
    app_later: boolValue(row.app_later),
    created_at: textValue(row.created_at),
    updated_at: textValue(row.updated_at),
  }
}
