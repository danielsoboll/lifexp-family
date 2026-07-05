import type { Family } from './types'

const ACTIVE_PLUS_STATUSES = new Set(['active', 'trialing', 'past_due'])

/** Status, bei denen trotz gültigem plus_until kein PLUS mehr gilt. */
const BLOCKING_PLUS_STATUSES = new Set(['unpaid', 'incomplete_expired'])

export function parsePlusUntilMs(plusUntil: string | null | undefined): number | null {
  if (!plusUntil) return null
  const ms = Date.parse(plusUntil)
  return Number.isNaN(ms) ? null : ms
}

export function isPlusPaidThrough(plusUntil: string | null | undefined, nowMs = Date.now()): boolean {
  const untilMs = parsePlusUntilMs(plusUntil)
  return untilMs !== null && untilMs > nowMs
}

/**
 * PLUS-Zugang: primär plus_until > jetzt (Stripe current_period_end).
 * Fallback ohne plus_until: plan=plus und aktiver Abo-Status (Sync-Lag nach Checkout).
 */
export function isFamilyPlus(
  family: Pick<
    Family,
    'plan' | 'plus_until' | 'subscription_status' | 'cancel_at_period_end'
  > | null | undefined,
): boolean {
  if (!family) return false

  const status = family.subscription_status
  if (status && BLOCKING_PLUS_STATUSES.has(status)) return false

  if (isPlusPaidThrough(family.plus_until)) return true

  return family.plan === 'plus' && (!status || ACTIVE_PLUS_STATUSES.has(status))
}

function formatPlusUntilDe(plusUntil: string): string {
  const date = new Date(plusUntil)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function familyPlusStatusLabel(
  family: Pick<
    Family,
    'plan' | 'plus_until' | 'subscription_status' | 'cancel_at_period_end'
  > | null | undefined,
): string {
  if (!family) return 'Free'
  if (isFamilyPlus(family)) {
    if (family.subscription_status === 'trialing') return 'PLUS (Testphase)'
    if (family.cancel_at_period_end && family.plus_until) {
      const untilLabel = formatPlusUntilDe(family.plus_until)
      return untilLabel ? `PLUS bis ${untilLabel}` : 'PLUS (gekündigt)'
    }
    if (family.subscription_status === 'past_due') return 'PLUS — Zahlung offen'
    return 'PLUS aktiv'
  }
  if (family.subscription_status === 'past_due') return 'Zahlung offen'
  return 'Free'
}

export function familyPlusTarifLine(
  family: Pick<
    Family,
    'plan' | 'plus_until' | 'subscription_status' | 'cancel_at_period_end'
  > | null | undefined,
): string {
  return `Dein Tarif: ${familyPlusStatusLabel(family)}`
}
