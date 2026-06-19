import { grantLeagueXpOnce, LEAGUE_XP_SOURCE } from './leagueXp'
import {
  calculateNutritionCompletionXp,
  calculateMovementKcalBonus,
  NUTRITION_COMPLETION_SOURCE,
  type NutritionCompletionResult,
  type NutritionRule,
} from './nutrition'
import { upsertTodayXpEventForSource } from './xpEvents'

export async function applyNutritionDayCompletion({
  kcal,
  protein,
  rule,
  movementXp,
  kcalMax,
  alcoholTrackingEnabled,
}: {
  kcal: number
  protein: number
  rule: NutritionRule | null
  movementXp: number
  kcalMax: number
  alcoholTrackingEnabled: boolean
}): Promise<{
  updated: boolean
  completion: NutritionCompletionResult | null
  leagueAwarded: boolean
  error: Error | null
}> {
  const completion = calculateNutritionCompletionXp({
    kcal,
    protein,
    rule,
    movementXp,
    alcoholTrackingEnabled,
  })
  if (!completion) {
    return {
      updated: false,
      completion: null,
      leagueAwarded: false,
      error: new Error('Keine gültige Ernährungsregel geladen — Abschluss nicht möglich.'),
    }
  }

  const { updated, error: xpError } = await upsertTodayXpEventForSource({
    category: 'ernaehrung',
    source: NUTRITION_COMPLETION_SOURCE,
    xp: completion.totalXp,
    metadata: {
      kcal,
      protein: Math.round(protein),
      kcal_xp: completion.kcalXp,
      kcal_band: completion.kcalBand,
      kcal_band_shifted_by_movement: completion.kcalBandShiftedByMovement,
      movement_kcal_bonus: calculateMovementKcalBonus(rule, movementXp),
      protein_xp: completion.proteinXp,
      protein_band: completion.proteinBand,
      alcohol_inactive_xp: completion.alcoholInactiveXp,
      movement_xp: movementXp,
      kcal_target: kcalMax,
      action: 'nutrition_day_complete',
    },
    celebrate: false,
  })

  if (xpError) {
    return { updated: false, completion, leagueAwarded: false, error: xpError }
  }

  const { awarded: leagueAwarded, error: leagueError } = await grantLeagueXpOnce({
    source: LEAGUE_XP_SOURCE.nutrition,
    scope: 'day',
  })

  if (leagueError) {
    return { updated, completion, leagueAwarded: false, error: leagueError }
  }

  return { updated, completion, leagueAwarded, error: null }
}
