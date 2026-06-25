import type { Family } from './types'

const PLUS_STATUSES = new Set(['active', 'trialing'])

export function isFamilyPlus(
  family: Pick<Family, 'plan' | 'plus_until' | 'subscription_status'> | null | undefined,
): boolean {
  if (!family || family.plan !== 'plus') return false

  if (family.plus_until) {
    const until = Date.parse(family.plus_until)
    if (!Number.isNaN(until) && until <= Date.now()) return false
  }

  if (family.subscription_status && !PLUS_STATUSES.has(family.subscription_status)) {
    return false
  }

  return true
}

export function familyPlusStatusLabel(
  family: Pick<Family, 'plan' | 'plus_until' | 'subscription_status'> | null | undefined,
): string {
  if (!family) return 'Free'
  if (isFamilyPlus(family)) {
    if (family.subscription_status === 'trialing') return 'PLUS (Testphase)'
    return 'PLUS aktiv'
  }
  if (family.subscription_status === 'past_due') return 'Zahlung offen'
  return 'Free'
}
