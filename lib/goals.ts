/** Werte in `profiles.goal_type` (Englisch, kleingeschrieben). */
export type PrimaryGoal = 'fit' | 'pump' | 'structure' | 'goal'

export const DEFAULT_PRIMARY_GOAL: PrimaryGoal = 'fit'

export type GoalOption = {
  value: PrimaryGoal
  label: string
  /** 1–2 passende Symbole neben dem Button-Text. */
  emojis: readonly [string, string?]
}

export const GOAL_OPTIONS: GoalOption[] = [
  { value: 'fit', label: 'Abnehmen + fit werden', emojis: ['⚖️', '🏃'] },
  { value: 'pump', label: 'Training/ Pump', emojis: ['🏃', '💪'] },
  { value: 'structure', label: 'Tagesstruktur verbessern', emojis: ['📅', '⏰'] },
  { value: 'goal', label: 'Ein Ziel erreichen', emojis: ['🎯', '🏆'] },
]

export const GOAL_LABELS: Record<PrimaryGoal, string> = Object.fromEntries(
  GOAL_OPTIONS.map((option) => [option.value, option.label]),
) as Record<PrimaryGoal, string>

const PROFILE_GENDER_ALIAS_GROUPS = [
  ['male', 'maennlich', 'männlich', 'm', 'mann', 'man'],
  ['female', 'weiblich', 'f', 'frau', 'woman'],
  ['divers', 'diverse', 'other', 'd'],
] as const

export const PROFILE_GENDER_LABELS: Record<string, string> = {
  male: 'Männlich',
  female: 'Weiblich',
  divers: 'Divers',
}

/** Kanonisches Geschlecht für DB-Abgleich (male | female | divers). */
export function normalizeProfileGender(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!raw) return 'divers'
  for (const group of PROFILE_GENDER_ALIAS_GROUPS) {
    const aliases: readonly string[] = group
    if (aliases.includes(raw)) return group[0]
  }
  return raw
}

export function profileGendersMatch(a: unknown, b: unknown): boolean {
  return normalizeProfileGender(a) === normalizeProfileGender(b)
}

export const GOAL_CHANGE_HINT =
  'jederzeit flexibel änderbar ohne deinen XP-Stand zu verlieren'

export const GOAL_TEXT_PROMPT = 'Was ist dein Ziel?'

export const GOAL_SECTION_LABEL = 'Hauptziel für jetzt'

/** Kleine Überschrift über den Ziel-Buttons (Ziele-Seite). */
export const GOAL_SECTION_LABEL_CLASS =
  'text-center text-xs font-bold uppercase tracking-wide text-amber-900 dark:text-amber-100'

/** Hinweis unter den Ziel-Buttons (Onboarding + Ziele). */
export const GOAL_CHANGE_HINT_CLASS =
  'text-center text-sm font-semibold leading-relaxed text-emerald-700 dark:text-emerald-300'

/** Legacy und Varianten → kanonischer `goal_type`. */
export function normalizePrimaryGoal(value: unknown): PrimaryGoal {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (raw === 'pump' || raw === 'muskelaufbau') return 'pump'
  if (raw === 'structure' || raw === 'tagesstruktur') return 'structure'
  if (raw === 'goal' || raw === 'ziel' || raw === 'ein_ziel') return 'goal'
  if (raw === 'fit' || raw === 'abnehmen') return 'fit'
  return DEFAULT_PRIMARY_GOAL
}
