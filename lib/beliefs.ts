import { fetchCurrentProfile, type ProfileSettings } from './profile'
import { supabase } from './supabase'

export type BeliefContent = {
  id: number
  title: string
  text: string
}

const WILDCARD_VALUES = new Set(['both', 'all', 'egal'])

const GENDER_ALIAS_GROUPS = [
  ['male', 'maennlich', 'männlich', 'm', 'mann', 'man'],
  ['female', 'weiblich', 'f', 'frau', 'woman'],
  ['divers', 'diverse', 'other', 'd'],
] as const

function normalize(value: unknown): string {
  if (typeof value === 'string') return value.trim().toLowerCase()
  return ''
}

function normalizeAlcoholMode(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  const raw = normalize(value)
  if (raw === 'true' || raw === '1' || raw === 'ja') return 'yes'
  if (raw === 'false' || raw === '0' || raw === 'nein') return 'no'
  return raw
}

function normalizeDimension(value: unknown): string {
  return normalizeAlcoholMode(value)
}

function textValue(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function isWildcard(value: string): boolean {
  return WILDCARD_VALUES.has(value)
}

function valuesInSameAliasGroup(a: string, b: string): boolean {
  if (a === b) return true
  for (const group of GENDER_ALIAS_GROUPS) {
    const aliases: readonly string[] = group
    if (aliases.includes(a) && aliases.includes(b)) return true
  }
  return false
}

function isActiveRow(row: Record<string, unknown>): boolean {
  const active = row.active
  if (active === undefined || active === null) return true
  if (typeof active === 'boolean') return active
  const raw = normalize(active)
  return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'ja'
}

/** Zeile mit gender, alcohol_mode und goal_type jeweils „both“ – Fallback für alle Profile. */
export function isUniversalBeliefRow(row: Record<string, unknown>): boolean {
  return (
    normalizeDimension(row.gender) === 'both' &&
    normalizeDimension(row.alcohol_mode) === 'both' &&
    normalizeDimension(row.goal_type) === 'both'
  )
}

function fieldMatches(rowValue: unknown, profileValue: string, kind: 'gender' | 'alcohol' | 'goal'): boolean {
  const rowNorm = kind === 'alcohol' ? normalizeAlcoholMode(rowValue) : normalizeDimension(rowValue)
  if (!rowNorm || isWildcard(rowNorm)) return true
  const profileNorm = kind === 'alcohol' ? normalizeAlcoholMode(profileValue) : normalizeDimension(profileValue)
  if (kind === 'gender') return valuesInSameAliasGroup(rowNorm, profileNorm)
  return rowNorm === profileNorm
}

function matchesProfileBelief(
  row: Record<string, unknown>,
  profile: Pick<ProfileSettings, 'gender' | 'alcoholMode' | 'goalType'>,
): boolean {
  if (isUniversalBeliefRow(row)) return false
  return (
    fieldMatches(row.gender, profile.gender, 'gender') &&
    fieldMatches(row.alcohol_mode, profile.alcoholMode, 'alcohol') &&
    fieldMatches(row.goal_type, profile.goalType, 'goal')
  )
}

function specificityScore(row: Record<string, unknown>): number {
  let score = 0
  for (const key of ['gender', 'alcohol_mode', 'goal_type'] as const) {
    const value = normalizeDimension(row[key])
    if (value && !isWildcard(value)) score += 1
  }
  return score
}

function beliefFromRow(row: Record<string, unknown>): BeliefContent | null {
  const idRaw = row.id
  let id = 0
  if (typeof idRaw === 'number' && Number.isFinite(idRaw)) {
    id = Math.floor(idRaw)
  } else if (typeof idRaw === 'string') {
    const parsed = parseInt(idRaw, 10)
    if (Number.isFinite(parsed)) id = parsed
  }

  const title = textValue(row, ['title', 'heading', 'headline', 'ueberschrift', 'überschrift'])
  const text = textValue(row, [
    'text',
    'content',
    'body',
    'belief_text',
    'satz',
    'glaubenssatz',
    'inhalt',
    'message',
  ])
  if (!title && !text) return null

  return { id, title, text }
}

export function pickBeliefForProfile(
  rows: Record<string, unknown>[],
  profile: Pick<ProfileSettings, 'gender' | 'alcoholMode' | 'goalType'>,
): BeliefContent | null {
  const activeRows = rows.filter(isActiveRow)
  if (!activeRows.length) return null

  const specific = activeRows.filter((row) => matchesProfileBelief(row, profile))
  const universal = activeRows.find(isUniversalBeliefRow)

  let chosen: Record<string, unknown> | undefined
  if (specific.length > 0) {
    chosen = [...specific].sort((a, b) => specificityScore(b) - specificityScore(a))[0]
  } else if (universal) {
    chosen = universal
  }

  return chosen ? beliefFromRow(chosen) : null
}

export async function fetchBeliefForCurrentProfile(): Promise<{
  belief: BeliefContent | null
  error: Error | null
  emptyTable: boolean
}> {
  const { settings, error: profileError } = await fetchCurrentProfile()
  if (profileError) {
    return { belief: null, error: profileError, emptyTable: false }
  }

  const { data, error } = await supabase.from('belief').select('*')
  if (error) {
    return { belief: null, error: new Error(error.message), emptyTable: false }
  }

  if (!Array.isArray(data) || data.length === 0) {
    return { belief: null, error: null, emptyTable: true }
  }

  const rows = data.filter((row): row is Record<string, unknown> => row !== null && typeof row === 'object')
  const belief = pickBeliefForProfile(rows, settings)
  return { belief, error: null, emptyTable: false }
}
