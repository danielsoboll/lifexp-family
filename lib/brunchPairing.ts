import {
  addMealEntry,
  BRUNCH_ESTIMATE_OPTION,
  entriesForMeal,
  isNothingEntry,
  isRoughEstimateEntry,
  mealSource,
  mealTypeToDb,
  MEAL_XP,
  type EstimateOption,
  type MealEntry,
  type MealType,
} from './nutrition'
import { recordXpEvent } from './xpEvents'

export type BrunchPairMeal = 'Frühstück' | 'Mittagessen'

export function isBrunchPairMeal(mealType: MealType): mealType is BrunchPairMeal {
  return mealType === 'Frühstück' || mealType === 'Mittagessen'
}

export function brunchPartnerMeal(mealType: MealType): BrunchPairMeal | null {
  if (mealType === 'Frühstück') return 'Mittagessen'
  if (mealType === 'Mittagessen') return 'Frühstück'
  return null
}

export function isBrunchEstimateOption(estimate: EstimateOption): boolean {
  return (
    estimate.label === BRUNCH_ESTIMATE_OPTION.label &&
    estimate.kcal === BRUNCH_ESTIMATE_OPTION.kcal &&
    Math.round(estimate.protein) === BRUNCH_ESTIMATE_OPTION.protein
  )
}

export function isBrunchRoughEstimateEntry(entry: Pick<MealEntry, 'name' | 'kcal' | 'protein'>): boolean {
  if (!isRoughEstimateEntry(entry)) return false
  return (
    entry.kcal === BRUNCH_ESTIMATE_OPTION.kcal &&
    Math.round(entry.protein) === BRUNCH_ESTIMATE_OPTION.protein
  )
}

export function mealHasBrunchRoughEstimate(entries: MealEntry[], mealType: MealType): boolean {
  if (!isBrunchPairMeal(mealType)) return false
  return entriesForMeal(entries, mealType).some((entry) => isBrunchRoughEstimateEntry(entry))
}

export function brunchDuplicateHintForMeal(mealType: BrunchPairMeal): string {
  if (mealType === 'Mittagessen') {
    return 'Bitte nur 1× erfassen — Brunch komplett bei Frühstück, dann bei Mittag „Nichts“ wählen.'
  }
  return 'Bitte nur 1× erfassen — Brunch komplett bei Mittag, dann bei Frühstück „Nichts“ wählen.'
}

/** Hinweis auf der Ernährungs-Übersicht, wenn die Partner-Mahlzeit Brunch hat und hier „Nichts“. */
export function brunchPairOverviewHint(mealType: MealType, entries: MealEntry[]): string | null {
  if (!isBrunchPairMeal(mealType)) return null
  const partner = brunchPartnerMeal(mealType)
  if (!partner || !mealHasBrunchRoughEstimate(entries, partner)) return null

  const thisMealEntries = entriesForMeal(entries, mealType)
  if (thisMealEntries.length !== 1 || !isNothingEntry(thisMealEntries[0])) return null

  if (mealType === 'Mittagessen') {
    return 'Brunch komplett bei Frühstück, zählt für Mittag mit. Auswahl trotzdem möglich.'
  }
  return 'Brunch komplett bei Mittag, zählt für Frühstück mit. Auswahl trotzdem möglich.'
}

/** Partner-Mahlzeit leer → „Nichts“ speichern (inkl. XP), wenn Brunch komplett erfasst wurde. */
export async function applyBrunchPartnerNothingIfNeeded(
  entries: MealEntry[],
  savedMealType: MealType,
): Promise<{ entries: MealEntry[]; error: Error | null }> {
  if (!isBrunchPairMeal(savedMealType)) {
    return { entries, error: null }
  }

  const partner = brunchPartnerMeal(savedMealType)
  if (!partner) return { entries, error: null }

  const partnerEntries = entriesForMeal(entries, partner)
  if (partnerEntries.length > 0) {
    return { entries, error: null }
  }

  const { entry, error } = await addMealEntry({
    mealType: partner,
    name: 'Nichts',
    kcal: 0,
    protein: 0,
  })
  if (error || !entry) {
    return {
      entries,
      error: error ?? new Error('Partner-Mahlzeit konnte nicht auf „Nichts“ gesetzt werden.'),
    }
  }

  const { error: xpError } = await recordXpEvent({
    category: 'ernaehrung',
    source: mealSource(partner),
    xp: MEAL_XP,
    metadata: { meal_type: mealTypeToDb(partner), selection: 'nothing', brunch_pair: true },
  })
  if (xpError) {
    return { entries, error: xpError }
  }

  return { entries: [...entries, entry], error: null }
}
