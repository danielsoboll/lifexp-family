import { normalizeMemberAccentKey } from './memberAccentColor'
import type { Family, FamilyPlan, FamilySubscriptionStatus } from './types'

function boolValue(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function planValue(value: unknown): FamilyPlan {
  return value === 'plus' ? 'plus' : 'free'
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function mapFamilyRow(row: Record<string, unknown>): Family {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    invite_code: typeof row.invite_code === 'string' ? row.invite_code : null,
    timezone: typeof row.timezone === 'string' ? row.timezone : 'Europe/Berlin',
    accent_key: normalizeMemberAccentKey(row.accent_key),
    plan: planValue(row.plan),
    subscription_status: nullableString(row.subscription_status) as FamilySubscriptionStatus | null,
    stripe_customer_id: nullableString(row.stripe_customer_id),
    stripe_subscription_id: nullableString(row.stripe_subscription_id),
    plus_until: nullableString(row.plus_until),
    trial_ends_at: nullableString(row.trial_ends_at),
    cancel_at_period_end: boolValue(row.cancel_at_period_end),
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
