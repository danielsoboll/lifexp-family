import type { ChildProfile } from './types'

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

export function mapChildProfileRow(row: ChildProfileRow): ChildProfile | null {
  const id = textValue(row.id)
  const familyId = textValue(row.family_id)
  const displayName = textValue(row.display_name).trim()
  if (!id || !familyId || !displayName) return null

  const birthYearRaw = row.birth_year
  const birthYear =
    birthYearRaw === null || birthYearRaw === undefined
      ? null
      : numberValue(birthYearRaw, NaN)
  const normalizedBirthYear =
    birthYear !== null && Number.isFinite(birthYear) ? birthYear : null

  return {
    id,
    family_id: familyId,
    display_name: displayName,
    birth_year: normalizedBirthYear,
    avatar_key: textValue(row.avatar_key, 'default') || 'default',
    total_xp: Math.max(0, numberValue(row.total_xp)),
    level: Math.max(1, numberValue(row.level, 1)),
    is_active: boolValue(row.is_active, true),
    sort_order: numberValue(row.sort_order),
    notes: row.notes === null || row.notes === undefined ? null : textValue(row.notes),
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
