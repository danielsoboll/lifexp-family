import { fetchIndivFoodItemsForMeal, indivFoodItemToFoodItem } from './foodItemsIndiv'
import { todayEventDate } from './xpEvents'
import { getActiveUserId } from './user'

function mealUserId(): string | null {
  return getActiveUserId()
}
import type { ProfileSettings } from './profile'
import { GOAL_LABELS, normalizePrimaryGoal, normalizeProfileGender, profileGendersMatch } from './goals'
import { nutritionRuleGenderFromProfile } from './typeCategory'
import { supabase } from './supabase'

export type StandardMealType = 'Frühstück' | 'Mittagessen' | 'Abendessen' | 'Snack'
export type MealType = StandardMealType | 'alcohol'

export const MEAL_OPTIONS: { type: StandardMealType; label: string; emoji: string }[] = [
  { type: 'Frühstück', label: 'Frühstück', emoji: '☀️' },
  { type: 'Mittagessen', label: 'Mittag', emoji: '🍽️' },
  { type: 'Abendessen', label: 'Abend', emoji: '🌙' },
  { type: 'Snack', label: 'Snack oder Shake', emoji: '🍎' },
]

export const ALCOHOL_MEAL = {
  type: 'alcohol' as const,
  label: 'Alkohol',
  emoji: '🍺',
  subtitle: 'Persönliches Ziel',
}

export const FOOD_MEAL_TYPE_ALCOHOL = 'alcohol'

/**
 * DB (food_items, food_items_indiv, meal_entries): meal_type nur Englisch.
 * UI (MealType, URLs, Labels): nur Deutsch — Mapping über mealTypeToDb / mealTypeFromDb.
 */
export type MealTypeDb = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'alcohol'

export const FOOD_MEAL_TYPE_BY_MEAL: Record<MealType, MealTypeDb> = {
  Frühstück: 'breakfast',
  Mittagessen: 'lunch',
  Abendessen: 'dinner',
  Snack: 'snack',
  alcohol: FOOD_MEAL_TYPE_ALCOHOL,
}

const MEAL_TYPE_FROM_DB: Record<MealTypeDb, MealType> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snack',
  alcohol: 'alcohol',
}

export function mealTypeToDb(mealType: MealType): MealTypeDb {
  return FOOD_MEAL_TYPE_BY_MEAL[mealType]
}

/** DB-Wert (englisch) → UI-Mahlzeit (deutsch). */
export function mealTypeFromDb(value: unknown): MealType | null {
  const raw = textValue(value).toLowerCase() as MealTypeDb
  return MEAL_TYPE_FROM_DB[raw] ?? null
}

export function mealOptionForType(mealType: MealType): { type: MealType; label: string; emoji: string } {
  if (mealType === 'alcohol') return ALCOHOL_MEAL
  return MEAL_OPTIONS.find((meal) => meal.type === mealType) ?? MEAL_OPTIONS[0]
}

/** Query-Parameter ?meal=… — Deutsch (UI) oder Englisch (DB-Legacy in URLs). */
export function mealFromParam(value: string | null): MealType {
  const parsed = parseErnaehrungMealScrollParam(value)
  return parsed ?? 'Frühstück'
}

/** ?meal= für Scroll auf der Ernährungs-Übersicht — null wenn unbekannt. */
export function parseErnaehrungMealScrollParam(value: string | null): MealType | null {
  if (!value?.trim()) return null
  const raw = decodeURIComponent(value).trim()
  const fromDb = mealTypeFromDb(raw)
  if (fromDb) return fromDb
  const lower = raw.toLowerCase()
  if (lower === 'alcohol' || lower === 'alkohol') return 'alcohol'
  const match = MEAL_OPTIONS.find((meal) => meal.type === raw || meal.type.toLowerCase() === lower)
  return match?.type ?? null
}

export function ernaehrungMealSectionId(mealType: MealType): string {
  return `ernaehrung-meal-${mealTypeToDb(mealType)}`
}

export function ernaehrungOverviewHref(mealType: MealType): string {
  return `/ernaehrung?meal=${encodeURIComponent(mealTypeToDb(mealType))}`
}

export function isStandardMealType(mealType: MealType): mealType is StandardMealType {
  return mealType !== 'alcohol'
}

export type EstimateOption = {
  label: string
  kcal: number
  protein: number
}

/** Grobe Schätzung für Frühstück, Mittag, Abend, Snack (inkl. Protein). */
export const STANDARD_ESTIMATE_OPTIONS: EstimateOption[] = [
  { label: 'wenig', kcal: 250, protein: 10 },
  { label: 'mittel', kcal: 500, protein: 25 },
  { label: 'viel', kcal: 800, protein: 40 },
]

export const BRUNCH_ESTIMATE_OPTION: EstimateOption = {
  label: 'Brunch komplett',
  kcal: 1200,
  protein: 60,
}

export const DINNER_EXTRA_ESTIMATE_OPTION: EstimateOption = {
  label: 'All-you-can-eat oder Grillparty',
  kcal: 1200,
  protein: 60,
}

/** Grobe Schätzung für Alkohol: nur Kalorien, kein Protein. */
export const ALCOHOL_ESTIMATE_OPTIONS: EstimateOption[] = [
  { label: 'wenig', kcal: 300, protein: 0 },
  { label: 'mittel', kcal: 600, protein: 0 },
  { label: 'viel', kcal: 1000, protein: 0 },
]

/** @deprecated Nutze estimateOptionsForMeal(). */
export const ESTIMATE_OPTIONS = STANDARD_ESTIMATE_OPTIONS

export function estimateOptionsForMeal(mealType: MealType): EstimateOption[] {
  return mealType === 'alcohol' ? ALCOHOL_ESTIMATE_OPTIONS : STANDARD_ESTIMATE_OPTIONS
}

/** Drei Presets (wenig / mittel / viel) für die Button-Reihe. */
export function estimatePresetsForMeal(mealType: MealType): EstimateOption[] {
  return estimateOptionsForMeal(mealType)
}

/** Volle Breite unter den drei Presets; nur bei Standard-Mahlzeiten. */
export function brunchEstimateForMeal(mealType: MealType): EstimateOption | null {
  if (mealType === 'alcohol') return null
  if (mealType === 'Abendessen') return DINNER_EXTRA_ESTIMATE_OPTION
  return BRUNCH_ESTIMATE_OPTION
}

/** Alle groben Schätz-Optionen inkl. Brunch (z. B. für Matching gespeicherter Einträge). */
export function allRoughEstimateOptionsForMeal(mealType: MealType): EstimateOption[] {
  const base = estimateOptionsForMeal(mealType)
  const brunch = brunchEstimateForMeal(mealType)
  return brunch ? [...base, brunch] : base
}

/** Präfix für alle groben Schätzungen in meal_entries.name (Statistik + UI-Trennung). */
export const ROUGH_ESTIMATE_NAME_PREFIX = 'Grobe Schätzung'

export function isRoughEstimateEntry(entry: Pick<MealEntry, 'name'>): boolean {
  return entry.name.trimStart().startsWith(ROUGH_ESTIMATE_NAME_PREFIX)
}

export function isNothingEntry(entry: Pick<MealEntry, 'name' | 'kcal' | 'protein'>): boolean {
  return normalizeMealEntryName(entry.name) === 'Nichts' && entry.kcal === 0 && entry.protein === 0
}

/** Genau erfasst (Name aus food_items / food_items_indiv, ohne Grob-Präfix). */
export function isExactMealEntry(entry: Pick<MealEntry, 'name' | 'kcal' | 'protein'>): boolean {
  return !isNothingEntry(entry) && !isRoughEstimateEntry(entry)
}

export function formatRoughEstimateCustomName(userName: string): string {
  const base = normalizeMealEntryName(userName)
  if (!base) return ''
  if (base.startsWith(ROUGH_ESTIMATE_NAME_PREFIX)) return base
  return `${ROUGH_ESTIMATE_NAME_PREFIX} · ${base}`
}

/** Anzeige in der UI; in der DB bleibt der volle Name für die Statistik. */
export function mealEntryDisplayName(name: string): string {
  const trimmed = name.trim()
  const customPrefix = `${ROUGH_ESTIMATE_NAME_PREFIX} · `
  const presetPrefix = `${ROUGH_ESTIMATE_NAME_PREFIX}: `
  if (trimmed.startsWith(customPrefix)) return trimmed.slice(customPrefix.length)
  if (trimmed.startsWith(presetPrefix)) return trimmed.slice(presetPrefix.length)
  return trimmed
}

export function findMatchingEstimateOption(
  entry: Pick<MealEntry, 'name' | 'kcal' | 'protein'>,
  mealType: MealType,
): EstimateOption | null {
  if (!isRoughEstimateEntry(entry)) return null
  return (
    allRoughEstimateOptionsForMeal(mealType).find(
      (option) => entry.kcal === option.kcal && Math.round(entry.protein) === option.protein,
    ) ?? null
  )
}

/** Tagesübersicht: Alkohol zählt zu kcal, nicht zu Protein. */
export function nutritionTotalsForOverview(entries: MealEntry[]): NutritionTotals {
  return entries.reduce(
    (totals, entry) => ({
      kcal: totals.kcal + entry.kcal,
      protein: totals.protein + (entry.mealType === 'alcohol' ? 0 : entry.protein),
    }),
    { kcal: 0, protein: 0 },
  )
}

export const MEAL_XP = 2
export const NUTRITION_ALCOHOL_INACTIVE_XP = 2
export const NUTRITION_KCAL_MAX = 1800
export const NUTRITION_PROTEIN_GOAL = 90
export const NUTRITION_PROTEIN_MIN_XP = 60
export const NUTRITION_COMPLETION_SOURCE = 'nutrition_completion'

export function mealSource(mealType: MealType): string {
  return `meal:${mealTypeToDb(mealType)}`
}

/** Beim Löschen von XP: neuer engl. Source + alter deutscher (Legacy). */
export function mealXpSources(mealType: MealType): string[] {
  const current = mealSource(mealType)
  return mealType === 'alcohol' ? [current] : [current, `meal:${mealType}`]
}

export type FoodItem = {
  id: number
  name: string
  mealType: string
  portionLabel: string
  kcal: number
  protein: number
}

export type MealEntry = {
  id: number
  mealType: MealType
  name: string
  kcal: number
  protein: number
}

const MEAL_ENTRY_NAME_MAX_LEN = 200

export function normalizeMealEntryName(value: string): string {
  return value.trim().slice(0, MEAL_ENTRY_NAME_MAX_LEN)
}

/** Anzeigename für wenig / mittel / viel bei grober Schätzung. */
export function estimatePresetMealName(label: string): string {
  const trimmed = label.trim()
  if (!trimmed) return 'Grobe Schätzung'
  return `Grobe Schätzung: ${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`
}

export type NutritionTotals = {
  kcal: number
  protein: number
}

export type NutritionKcalBand = 'low' | 'min' | 'opt' | 'high' | 'ext' | 'high_plus'
export type NutritionProteinBand = 'low' | 'min' | 'opt' | 'ext' | 'plus'

export type NutritionCompletionResult = {
  totalXp: number
  kcalXp: number
  proteinXp: number
  alcoholInactiveXp: number
  kcalBand: NutritionKcalBand
  proteinBand: NutritionProteinBand
  kcalBandShiftedByMovement: boolean
}

export type NutritionRule = {
  kcalLow: number
  kcalMin: number
  kcalOpt: number
  kcalHigh: number
  kcalExt: number
  xpKcalLow: number
  xpKcalMin: number
  xpKcalOpt: number
  xpKcalHigh: number
  xpKcalExt: number
  xpHighPlus: number
  protLow: number
  protMin: number
  protOpt: number
  protExt: number
  xpProtLow: number
  xpProtMin: number
  xpProtOpt: number
  xpProtExt: number
  xpProtPlus: number
  plusBew1: number
}

type FoodItemRow = Record<string, unknown>
type MealEntryRow = Record<string, unknown>
type NutritionRuleRow = Record<string, unknown>

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function numberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function foodItemFromRow(row: FoodItemRow): FoodItem {
  return {
    id: Math.floor(numberValue(row.id)),
    name: textValue(row.name) || 'Lebensmittel',
    mealType: textValue(row.meal_type),
    portionLabel: textValue(row.portion_label) || '1 Portion',
    kcal: Math.floor(numberValue(row.kcal)),
    protein: numberValue(row.protein),
  }
}

function parseMealType(value: unknown): MealType {
  return mealTypeFromDb(value) ?? 'Frühstück'
}

function mealEntryFromRow(row: MealEntryRow): MealEntry {
  return {
    id: Math.floor(numberValue(row.id)),
    mealType: parseMealType(row.meal_type),
    name: textValue(row.name),
    kcal: Math.floor(numberValue(row.kcal)),
    protein: numberValue(row.protein),
  }
}

function nutritionRuleFromRow(row: NutritionRuleRow | null): NutritionRule {
  return {
    kcalLow: Math.floor(numberValue(row?.kcal_low)),
    kcalMin: Math.floor(numberValue(row?.kcal_min)),
    kcalOpt: Math.floor(numberValue(row?.kcal_opt)) || NUTRITION_KCAL_MAX,
    kcalHigh: Math.floor(numberValue(row?.kcal_high)),
    kcalExt: Math.floor(numberValue(row?.kcal_ext)),
    xpKcalLow: Math.floor(numberValue(row?.xp_kcal_low)),
    xpKcalMin: Math.floor(numberValue(row?.xp_kcal_min)),
    xpKcalOpt: Math.floor(numberValue(row?.xp_kcal_opt)),
    xpKcalHigh: Math.floor(numberValue(row?.xp_kcal_high)),
    xpKcalExt: Math.floor(numberValue(row?.xp_kcal_ext)),
    xpHighPlus: Math.floor(numberValue(row?.xp_high_plus)),
    protLow: Math.floor(numberValue(row?.prot_low)),
    protMin: Math.floor(numberValue(row?.prot_min)),
    protOpt: Math.floor(numberValue(row?.prot_opt)) || NUTRITION_PROTEIN_GOAL,
    protExt: Math.floor(numberValue(row?.prot_ext)),
    xpProtLow: Math.floor(numberValue(row?.xp_prot_low)),
    xpProtMin: Math.floor(numberValue(row?.xp_prot_min)),
    xpProtOpt: Math.floor(numberValue(row?.xp_prot_opt)),
    xpProtExt: Math.floor(numberValue(row?.xp_prot_ext)),
    xpProtPlus: Math.floor(numberValue(row?.xp_prot_plus)),
    plusBew1: numberValue(row?.plus_bew1),
  }
}

export function defaultNutritionRule(): NutritionRule {
  return nutritionRuleFromRow(null)
}

export function isNutritionRuleUsable(rule: NutritionRule | null): rule is NutritionRule {
  if (!rule) return false
  return rule.kcalLow > 0 && rule.kcalMin > rule.kcalLow && rule.kcalOpt >= rule.kcalMin
}

const NUTRITION_RULE_WILDCARDS = new Set(['both', 'all', 'egal', ''])

function nutritionRuleDimensionWildcard(value: unknown): boolean {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return !raw || NUTRITION_RULE_WILDCARDS.has(raw)
}

function nutritionRuleTypeCategory(value: unknown): number {
  const parsed = Math.floor(numberValue(value))
  return parsed > 0 ? parsed : 0
}

function nutritionRuleRowMatchesProfile(
  row: NutritionRuleRow,
  profile: Pick<ProfileSettings, 'gender' | 'goalType' | 'typeCategory'>,
): boolean {
  const rowGender = row.gender
  const genderOk =
    nutritionRuleDimensionWildcard(rowGender) ||
    profileGendersMatch(rowGender, profile.gender)

  const rowGoal = normalizePrimaryGoal(row.goal_type)
  const goalOk =
    nutritionRuleDimensionWildcard(row.goal_type) || rowGoal === profile.goalType

  const rowTypeCategory = nutritionRuleTypeCategory(row.type_category)
  const typeOk = rowTypeCategory === 0 || rowTypeCategory === profile.typeCategory

  return genderOk && goalOk && typeOk
}

function nutritionRuleSpecificityScore(
  row: NutritionRuleRow,
  profile: Pick<ProfileSettings, 'gender' | 'goalType' | 'typeCategory'>,
): number {
  let score = 0

  if (!nutritionRuleDimensionWildcard(row.gender) && profileGendersMatch(row.gender, profile.gender)) {
    score += 4
  } else if (nutritionRuleDimensionWildcard(row.gender)) {
    score += 1
  }

  if (
    !nutritionRuleDimensionWildcard(row.goal_type) &&
    normalizePrimaryGoal(row.goal_type) === profile.goalType
  ) {
    score += 4
  } else if (nutritionRuleDimensionWildcard(row.goal_type)) {
    score += 1
  }

  const rowTypeCategory = nutritionRuleTypeCategory(row.type_category)
  if (rowTypeCategory > 0 && rowTypeCategory === profile.typeCategory) {
    score += 4
  } else if (rowTypeCategory === 0) {
    score += 1
  }

  return score
}

function describeNutritionProfileKey(
  profile: Pick<ProfileSettings, 'gender' | 'goalType' | 'typeCategory'>,
): string {
  const gender = normalizeProfileGender(profile.gender)
  const genderLabel =
    gender === 'male' ? 'Männlich' : gender === 'female' ? 'Weiblich' : gender === 'divers' ? 'Divers' : gender
  const goalLabel = GOAL_LABELS[profile.goalType] ?? profile.goalType
  return `${genderLabel} · ${goalLabel} · Typ ${profile.typeCategory}`
}

function describeNutritionRuleRow(row: NutritionRuleRow): string {
  const gender = normalizeProfileGender(row.gender)
  const genderLabel =
    gender === 'male' ? 'Männlich' : gender === 'female' ? 'Weiblich' : gender === 'divers' ? 'Divers' : gender
  const goalLabel = GOAL_LABELS[normalizePrimaryGoal(row.goal_type)] ?? String(row.goal_type ?? '–')
  const typeCategory = nutritionRuleTypeCategory(row.type_category)
  return `${genderLabel} · ${goalLabel} · Typ ${typeCategory > 0 ? typeCategory : '–'}`
}

export type NutritionRuleFetchResult = {
  rule: NutritionRule | null
  matched: boolean
  usedFallback: boolean
  warning: string | null
  matchLabel: string | null
  error: Error | null
}

function normalizeNutritionRuleProfile(
  profile: Pick<ProfileSettings, 'gender' | 'goalType' | 'typeCategory'>,
): Pick<ProfileSettings, 'gender' | 'goalType' | 'typeCategory'> {
  return {
    gender: nutritionRuleGenderFromProfile(profile.gender),
    goalType: normalizePrimaryGoal(profile.goalType),
    typeCategory: profile.typeCategory,
  }
}

export async function fetchNutritionRule(
  profile: Pick<ProfileSettings, 'gender' | 'goalType' | 'typeCategory'>,
): Promise<NutritionRuleFetchResult> {
  const lookup = normalizeNutritionRuleProfile(profile)
  const profileKey = describeNutritionProfileKey(lookup)

  const { data, error } = await supabase.from('nutrition_rules').select('*')

  if (error) {
    return {
      rule: null,
      matched: false,
      usedFallback: false,
      warning: null,
      matchLabel: null,
      error: new Error(error.message),
    }
  }

  const rows = (Array.isArray(data) ? data : []).filter(
    (row): row is NutritionRuleRow => row !== null && typeof row === 'object',
  )

  if (rows.length === 0) {
    return {
      rule: null,
      matched: false,
      usedFallback: false,
      warning: `Keine Ernährungsregel in nutrition_rules hinterlegt (Profil: ${profileKey}).`,
      matchLabel: null,
      error: null,
    }
  }

  const matching = rows.filter((row) => nutritionRuleRowMatchesProfile(row, lookup))
  if (matching.length > 0) {
    const bestRow = [...matching].sort(
      (a, b) => nutritionRuleSpecificityScore(b, lookup) - nutritionRuleSpecificityScore(a, lookup),
    )[0]
    const rule = nutritionRuleFromRow(bestRow)
    return {
      rule: isNutritionRuleUsable(rule) ? rule : null,
      matched: true,
      usedFallback: false,
      warning: isNutritionRuleUsable(rule)
        ? null
        : `Ernährungsregel für ${profileKey} ist unvollständig (Grenzwerte fehlen).`,
      matchLabel: describeNutritionRuleRow(bestRow),
      error: null,
    }
  }

  if (rows.length === 1) {
    const fallbackRow = rows[0]
    const rule = nutritionRuleFromRow(fallbackRow)
    const usable = isNutritionRuleUsable(rule)
    return {
      rule: usable ? rule : null,
      matched: false,
      usedFallback: usable,
      warning: usable
        ? `Keine exakte Regel für ${profileKey}. Vorläufig wird ${describeNutritionRuleRow(fallbackRow)} verwendet.`
        : `Keine passende Ernährungsregel für ${profileKey}; vorhandene Regel ist unvollständig.`,
      matchLabel: describeNutritionRuleRow(fallbackRow),
      error: null,
    }
  }

  return {
    rule: null,
    matched: false,
    usedFallback: false,
    warning: `Keine Ernährungsregel für ${profileKey} gefunden. Bitte passenden Eintrag in nutrition_rules anlegen.`,
    matchLabel: null,
    error: null,
  }
}

export function calculateMovementKcalBonus(rule: NutritionRule | null, movementXp: number): number {
  return Math.max(0, Math.floor(movementXp)) * (rule?.plusBew1 ?? 0)
}

/** kcal-Stand minus Trainings-Bonus — für die Zonen-Ermittlung (Anzeige-Grenzwerte unverändert). */
export function effectiveKcalForNutritionBand(
  kcal: number,
  rule: NutritionRule,
  movementXp: number,
): number {
  return Math.max(0, Math.floor(kcal) - calculateMovementKcalBonus(rule, movementXp))
}

export function resolveNutritionKcalBandWithMovement(
  kcal: number,
  rule: NutritionRule,
  movementXp: number,
): { band: NutritionKcalBand; xp: number; shiftedByMovement: boolean } {
  const rawResult = resolveNutritionKcalBand(kcal, rule)
  const bonus = calculateMovementKcalBonus(rule, movementXp)
  if (bonus <= 0) {
    return { ...rawResult, shiftedByMovement: false }
  }

  const adjustedResult = resolveNutritionKcalBand(
    effectiveKcalForNutritionBand(kcal, rule, movementXp),
    rule,
  )
  return {
    ...adjustedResult,
    shiftedByMovement: adjustedResult.band !== rawResult.band,
  }
}

export function calculateNutritionKcalMax(rule: NutritionRule | null, movementXp: number): number {
  const base = rule?.kcalOpt && rule.kcalOpt > 0 ? rule.kcalOpt : NUTRITION_KCAL_MAX
  return Math.max(0, Math.round(base + calculateMovementKcalBonus(rule, movementXp)))
}

export function nutritionTotals(entries: MealEntry[]): NutritionTotals {
  return entries.reduce(
    (totals, entry) => ({
      kcal: totals.kcal + entry.kcal,
      protein: totals.protein + entry.protein,
    }),
    { kcal: 0, protein: 0 },
  )
}

export function resolveNutritionKcalBand(
  kcal: number,
  rule: NutritionRule,
): { band: NutritionKcalBand; xp: number } {
  const amount = Math.max(0, Math.floor(kcal))

  if (amount < rule.kcalLow) {
    return { band: 'low', xp: rule.xpKcalLow }
  }
  if (amount < rule.kcalMin) {
    return { band: 'min', xp: rule.xpKcalMin }
  }
  if (amount < rule.kcalOpt) {
    return { band: 'opt', xp: rule.xpKcalOpt }
  }
  if (amount < rule.kcalHigh) {
    return { band: 'high', xp: rule.xpKcalHigh }
  }
  if (amount <= rule.kcalExt) {
    return { band: 'ext', xp: rule.xpKcalExt }
  }

  return { band: 'high_plus', xp: rule.xpHighPlus }
}

export function resolveNutritionProteinBand(
  protein: number,
  rule: NutritionRule,
): { band: NutritionProteinBand; xp: number } {
  const amount = Math.max(0, protein)

  if (amount < rule.protLow) {
    return { band: 'low', xp: rule.xpProtLow }
  }
  if (amount < rule.protMin) {
    return { band: 'min', xp: rule.xpProtMin }
  }
  if (amount < rule.protOpt) {
    return { band: 'opt', xp: rule.xpProtOpt }
  }
  if (amount <= rule.protExt) {
    return { band: 'ext', xp: rule.xpProtExt }
  }

  return { band: 'plus', xp: rule.xpProtPlus }
}

export function calculateNutritionCompletionXp({
  kcal,
  protein,
  rule,
  movementXp = 0,
  alcoholTrackingEnabled = true,
}: {
  kcal: number
  protein: number
  rule: NutritionRule | null
  movementXp?: number
  alcoholTrackingEnabled?: boolean
}): NutritionCompletionResult | null {
  if (!isNutritionRuleUsable(rule)) return null

  const kcalResult = resolveNutritionKcalBandWithMovement(kcal, rule, movementXp)
  const proteinResult = resolveNutritionProteinBand(protein, rule)
  const alcoholInactiveXp = alcoholTrackingEnabled ? 0 : NUTRITION_ALCOHOL_INACTIVE_XP

  return {
    kcalXp: kcalResult.xp,
    proteinXp: proteinResult.xp,
    alcoholInactiveXp,
    totalXp: kcalResult.xp + proteinResult.xp + alcoholInactiveXp,
    kcalBand: kcalResult.band,
    proteinBand: proteinResult.band,
    kcalBandShiftedByMovement: kcalResult.shiftedByMovement,
  }
}

export function mealTypesWithEntries(entries: MealEntry[]): Set<MealType> {
  return new Set(entries.map((entry) => entry.mealType))
}

/** Alle Pflicht-Bereiche erfasst (4 Mahlzeiten, optional + Alkohol). */
export function nutritionRequiredMealsComplete(
  mealsDone: Set<MealType>,
  trackAlcohol: boolean,
): boolean {
  for (const meal of MEAL_OPTIONS) {
    if (!mealsDone.has(meal.type)) return false
  }
  if (trackAlcohol && !mealsDone.has('alcohol')) return false
  return true
}

export function standardMealTypesWithEntries(entries: MealEntry[]): Set<StandardMealType> {
  const set = new Set<StandardMealType>()
  for (const entry of entries) {
    if (isStandardMealType(entry.mealType)) set.add(entry.mealType)
  }
  return set
}

export function entriesForMeal(entries: MealEntry[], mealType: MealType): MealEntry[] {
  return entries.filter((entry) => entry.mealType === mealType)
}

export async function fetchActiveFoodItems(): Promise<{ items: FoodItem[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('food_items')
    .select('id,name,meal_type,portion_label,kcal,protein')
    .eq('active', true)
    .order('meal_type', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    return { items: [], error: new Error(error.message) }
  }

  return { items: (Array.isArray(data) ? data : []).map((row) => foodItemFromRow(row as FoodItemRow)), error: null }
}

/** Lebensmittel für eine Mahlzeit (food_items.meal_type = breakfast | lunch | …). */
export async function fetchFoodItemsForMeal(
  mealType: MealType,
): Promise<{ items: FoodItem[]; error: Error | null }> {
  const mealTypeDb = FOOD_MEAL_TYPE_BY_MEAL[mealType].toLowerCase()
  const { data, error } = await supabase
    .from('food_items')
    .select('id,name,meal_type,portion_label,kcal,protein')
    .eq('active', true)
    .ilike('meal_type', mealTypeDb)
    .order('name', { ascending: true })

  if (error) {
    return { items: [], error: new Error(error.message) }
  }

  return { items: (Array.isArray(data) ? data : []).map((row) => foodItemFromRow(row as FoodItemRow)), error: null }
}

/**
 * Genau-Auswahl: solange keine food_items_indiv existieren → food_items;
 * danach nur noch die persönliche Liste.
 */
export async function fetchExactSelectionFoodItems(
  mealType: MealType,
): Promise<{ items: FoodItem[]; usesIndivList: boolean; error: Error | null }> {
  const { items: indivItems, error: indivError } = await fetchIndivFoodItemsForMeal(mealType)
  if (indivError) {
    return { items: [], usesIndivList: false, error: indivError }
  }
  if (indivItems.length > 0) {
    return {
      items: indivItems.map(indivFoodItemToFoodItem),
      usesIndivList: true,
      error: null,
    }
  }
  const { items, error } = await fetchFoodItemsForMeal(mealType)
  return { items, usesIndivList: false, error }
}

export async function fetchTodayMealEntries(): Promise<{ entries: MealEntry[]; error: Error | null }> {
  const userId = mealUserId()
  if (!userId) return { entries: [], error: null }

  const { data, error } = await supabase
    .from('meal_entries')
    .select('id,meal_type,name,kcal,protein')
    .eq('user_id', userId)
    .eq('event_date', todayEventDate())
    .order('created_at', { ascending: true })

  if (error) {
    return { entries: [], error: new Error(error.message) }
  }

  return { entries: (Array.isArray(data) ? data : []).map((row) => mealEntryFromRow(row as MealEntryRow)), error: null }
}

export async function addMealEntry({
  mealType,
  name = '',
  kcal,
  protein,
}: {
  mealType: MealType
  name?: string
  kcal: number
  protein: number
}): Promise<{ entry: MealEntry | null; error: Error | null }> {
  const userId = mealUserId()
  if (!userId) {
    return { entry: null, error: new Error('Kein Benutzer. Bitte Onboarding abschließen.') }
  }

  const mealName = normalizeMealEntryName(name)

  const { data, error } = await supabase
    .from('meal_entries')
    .insert({
      user_id: userId,
      meal_type: mealTypeToDb(mealType),
      name: mealName || null,
      kcal: Math.max(0, Math.floor(kcal)),
      protein: Math.max(0, protein),
      event_date: todayEventDate(),
    })
    .select('id,meal_type,name,kcal,protein')
    .single()

  if (error) {
    return { entry: null, error: new Error(error.message) }
  }

  return { entry: mealEntryFromRow(data as MealEntryRow), error: null }
}

export async function deleteTodayMealEntriesForMeal(
  mealType: MealType,
): Promise<{ error: Error | null }> {
  const userId = mealUserId()
  if (!userId) return { error: new Error('Kein Benutzer. Bitte Onboarding abschließen.') }

  const { error } = await supabase
    .from('meal_entries')
    .delete()
    .eq('user_id', userId)
    .eq('event_date', todayEventDate())
    .eq('meal_type', mealTypeToDb(mealType))

  return { error: error ? new Error(error.message) : null }
}

export async function deleteMealEntryById(id: number): Promise<{ error: Error | null }> {
  const userId = mealUserId()
  if (!userId) return { error: new Error('Kein Benutzer. Bitte Onboarding abschließen.') }

  const { error } = await supabase
    .from('meal_entries')
    .delete()
    .eq('user_id', userId)
    .eq('event_date', todayEventDate())
    .eq('id', id)

  return { error: error ? new Error(error.message) : null }
}

export async function deleteMealEntriesByIds(ids: number[]): Promise<{ error: Error | null }> {
  if (ids.length === 0) return { error: null }

  const userId = mealUserId()
  if (!userId) return { error: new Error('Kein Benutzer. Bitte Onboarding abschließen.') }

  const { error } = await supabase
    .from('meal_entries')
    .delete()
    .eq('user_id', userId)
    .eq('event_date', todayEventDate())
    .in('id', ids)

  return { error: error ? new Error(error.message) : null }
}

export async function deleteAllMealEntriesForActiveUser(): Promise<{ error: Error | null }> {
  const userId = mealUserId()
  if (!userId) return { error: null }

  const { error } = await supabase.from('meal_entries').delete().eq('user_id', userId)
  return { error: error ? new Error(error.message) : null }
}

export async function resetDemoMealEntries(): Promise<{ error: Error | null }> {
  return deleteAllMealEntriesForActiveUser()
}
