import { normalizePrimaryGoal, normalizeProfileGender, type PrimaryGoal } from './goals'

/** type_category aus Gewicht (nutrition_rules). */
export function deriveTypeCategoryFromWeight(weightKg: number): number {
  const w = Math.floor(Number(weightKg))
  if (!Number.isFinite(w) || w <= 0) return 2
  if (w < 50) return 1
  if (w < 75) return 2
  if (w < 95) return 3
  if (w < 110) return 4
  return 5
}

/** Für profiles.type_category — derzeit nur vom Gewicht abhängig. */
export function deriveTypeCategory(
  _gender: string,
  weightKg: number,
  _goalType: PrimaryGoal,
): number {
  return deriveTypeCategoryFromWeight(weightKg)
}

/** nutrition_rules: „divers“ und „male“ → male; „female“ bleibt female. */
export function nutritionRuleGenderFromProfile(gender: string): 'male' | 'female' {
  return normalizeProfileGender(gender) === 'female' ? 'female' : 'male'
}

export function nutritionProfileLookupFromInputs(input: {
  gender: string
  goalType: PrimaryGoal
  weightKg: number
}): { gender: 'male' | 'female'; goalType: PrimaryGoal; typeCategory: number } {
  return {
    gender: nutritionRuleGenderFromProfile(input.gender),
    goalType: normalizePrimaryGoal(input.goalType),
    typeCategory: deriveTypeCategoryFromWeight(input.weightKg),
  }
}
