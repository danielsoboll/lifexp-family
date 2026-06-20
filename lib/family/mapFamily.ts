import { normalizeMemberAccentKey } from './memberAccentColor'
import type { Family } from './types'

export function mapFamilyRow(row: Record<string, unknown>): Family {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    invite_code: typeof row.invite_code === 'string' ? row.invite_code : null,
    timezone: typeof row.timezone === 'string' ? row.timezone : 'Europe/Berlin',
    accent_key: normalizeMemberAccentKey(row.accent_key),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  }
}
