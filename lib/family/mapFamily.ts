import { normalizeMemberAccentKey } from './memberAccentColor'
import type { Family } from './types'

function boolValue(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function mapFamilyRow(row: Record<string, unknown>): Family {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    invite_code: typeof row.invite_code === 'string' ? row.invite_code : null,
    timezone: typeof row.timezone === 'string' ? row.timezone : 'Europe/Berlin',
    accent_key: normalizeMemberAccentKey(row.accent_key),
    guide_welcome_seen: boolValue(row.guide_welcome_seen),
    guide_quest_seen: boolValue(row.guide_quest_seen),
    guide_invite_seen: boolValue(row.guide_invite_seen),
    guide_profile_seen: boolValue(row.guide_profile_seen),
    guide_finished: boolValue(row.guide_finished),
    guide_solo_quest_seen: boolValue(row.guide_solo_quest_seen),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  }
}
