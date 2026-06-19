import { fetchCurrentProfile, type ProfileSettings } from './profile'
import { supabase } from './supabase'
import type { XpEventCategory } from './xpEvents'

export type AreaInfoKey = XpEventCategory | 'aufgabenplaner' | 'was_jetzt_tun' | 'alkohol' | 'motivation'

export type FetchAreaInfoOptions = {
  /** Leer = Haupt-Infotext ohne Subarea; z. B. „Schritte“ für Unterseite. */
  subarea?: string
}

export type AreaInfo = {
  title: string
  content: string
}

/** Anzeigenamen wie in Supabase `area_info.area`. */
export const AREA_DB_NAMES: Record<AreaInfoKey, string> = {
  bewegung: 'Bewegung',
  ernaehrung: 'Ernährung',
  wissen: 'Wissen',
  mein_tag: 'Mein Tag',
  plus: 'Plus',
  liga: 'Liga',
  aufgabenplaner: 'Aufgabenplaner',
  was_jetzt_tun: 'Was jetzt tun',
  alkohol: 'Alkohol',
  motivation: 'Motivation',
}

const GOAL_TYPE_WILDCARDS = ['both', 'all', 'egal'] as const
const GENDER_WILDCARDS = ['both', 'all', 'egal'] as const
const ALCOHOL_MODE_WILDCARDS = ['both', 'all', 'egal'] as const

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeSubarea(value: unknown): string {
  if (value === null || value === undefined) return ''
  return normalize(String(value))
}

function isWildcard(value: string): boolean {
  return GOAL_TYPE_WILDCARDS.includes(value as (typeof GOAL_TYPE_WILDCARDS)[number])
    || GENDER_WILDCARDS.includes(value as (typeof GENDER_WILDCARDS)[number])
    || ALCOHOL_MODE_WILDCARDS.includes(value as (typeof ALCOHOL_MODE_WILDCARDS)[number])
}

function isActiveRow(row: Record<string, unknown>): boolean {
  const active = row.active
  if (active === undefined || active === null) return true
  if (typeof active === 'boolean') return active
  const raw = normalize(active)
  return raw !== 'false' && raw !== '0' && raw !== 'no' && raw !== 'nein'
}

function matchesSubarea(rowSubarea: unknown, wantedSubarea: string): boolean {
  const rowNorm = normalizeSubarea(rowSubarea)
  const wantedNorm = normalize(wantedSubarea)
  if (!wantedNorm) {
    return rowNorm === ''
  }
  return rowNorm === wantedNorm
}

function textValue(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function areaQueryValues(area: AreaInfoKey): string[] {
  const dbName = AREA_DB_NAMES[area]
  return [...new Set([dbName, dbName.toLowerCase(), area, area.replace(/_/g, ' ')])]
}

function specificityScore(row: Record<string, unknown>, settings: ProfileSettings): number {
  let score = 0
  const goal = normalize(settings.goalType)
  const gender = normalize(settings.gender)
  const alcohol = normalize(settings.alcoholMode)

  const rowGoal = normalize(row.goal_type)
  const rowGender = normalize(row.gender)
  const rowAlcohol = normalize(row.alcohol_mode)

  if (rowGoal && !isWildcard(rowGoal) && rowGoal === goal) score += 4
  if (rowGender && !isWildcard(rowGender) && rowGender === gender) score += 2
  if (rowAlcohol && !isWildcard(rowAlcohol) && rowAlcohol === alcohol) score += 1

  return score
}

function pickBestAreaInfoRow(
  rows: Record<string, unknown>[],
  settings: ProfileSettings,
  wantedSubarea: string,
): Record<string, unknown> | null {
  const matching = rows.filter(
    (row) => isActiveRow(row) && matchesSubarea(row.subarea, wantedSubarea),
  )
  if (!matching.length) return null
  if (matching.length === 1) return matching[0]

  return [...matching].sort((a, b) => specificityScore(b, settings) - specificityScore(a, settings))[0]
}

export async function fetchAreaInfo(
  area: AreaInfoKey,
  options: FetchAreaInfoOptions = {},
): Promise<{
  info: AreaInfo | null
  error: Error | null
}> {
  const { settings, error: profileError } = await fetchCurrentProfile()
  if (profileError) {
    return { info: null, error: profileError }
  }

  const wantedSubarea = options.subarea?.trim() ?? ''
  const areaValues = areaQueryValues(area)
  const goalTypeFilter = [settings.goalType, ...GOAL_TYPE_WILDCARDS]
  const genderFilter = [settings.gender, ...GENDER_WILDCARDS]
  const alcoholFilter = [settings.alcoholMode, ...ALCOHOL_MODE_WILDCARDS]

  const { data, error } = await supabase
    .from('area_info')
    .select('*')
    .in('area', areaValues)
    .in('goal_type', goalTypeFilter)
    .in('gender', genderFilter)
    .in('alcohol_mode', alcoholFilter)
    .limit(40)

  if (error) {
    return { info: null, error: new Error(error.message) }
  }

  if (!Array.isArray(data)) {
    return { info: null, error: null }
  }

  const rows = data.filter((row): row is Record<string, unknown> => row !== null && typeof row === 'object')
  const record = pickBestAreaInfoRow(rows, settings, wantedSubarea)
  if (!record) {
    return { info: null, error: null }
  }

  const title = textValue(record, ['title', 'heading', 'headline'])
  const content = textValue(record, ['content', 'text', 'body', 'info_text'])
  return { info: title || content ? { title, content } : null, error: null }
}
