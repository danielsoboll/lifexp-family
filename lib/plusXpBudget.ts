import { cetToday } from './cetDate'
import { isAlcoholTrackingEnabled, type ProfileSettings } from './profile'
import { getActiveUserId } from './user'
import { supabase } from './supabase'

export const PLUS_XP_TASK_BUDGET_BASE = 16
export const PLUS_XP_ALCOHOL_RESERVE = 4
export const PLUS_XP_GLAUBENSSATZ_MAX = 2

/** @deprecated Basiswert – nutze `taskPlannerPlusXpBudget()`. */
export const TASK_PLANNER_PLUS_XP_BUDGET = PLUS_XP_TASK_BUDGET_BASE

export const PLANNER_TASK_XP_REDUCE_MESSAGE =
  'Bitte die XP für die persönlichen Aufgaben erst reduzieren.'

export type IndividualGoalFlags = {
  alcoholTracking: boolean
  motivationTracking: boolean
}

export function individualGoalFlagsFromProfile(
  settings: Pick<ProfileSettings, 'alcoholMode' | 'motivationMode'>,
): IndividualGoalFlags {
  return {
    alcoholTracking: isAlcoholTrackingEnabled(settings.alcoholMode),
    motivationTracking: settings.motivationMode === true,
  }
}

/** Verfügbares Plus-XP-Budget für Aufgabenplaner-Aufgaben (heute/morgen). */
export function taskPlannerPlusXpBudget(flags: IndividualGoalFlags): number {
  let budget = PLUS_XP_TASK_BUDGET_BASE
  if (flags.alcoholTracking) budget -= PLUS_XP_ALCOHOL_RESERVE
  if (flags.motivationTracking) budget -= PLUS_XP_GLAUBENSSATZ_MAX
  return Math.max(0, budget)
}

export function taskPlannerBudgetBreakdown(flags: IndividualGoalFlags): {
  budget: number
  alcoholReserve: number
  glaubenssatzReserve: number
} {
  const alcoholReserve = flags.alcoholTracking ? PLUS_XP_ALCOHOL_RESERVE : 0
  const glaubenssatzReserve = flags.motivationTracking ? PLUS_XP_GLAUBENSSATZ_MAX : 0
  return {
    budget: taskPlannerPlusXpBudget(flags),
    alcoholReserve,
    glaubenssatzReserve,
  }
}

/** Summe vergebenener Plus-XP auf Aufgaben ab heute (CET). */
export async function sumPlannerTaskPlusXpFromToday(): Promise<{
  sum: number
  error: Error | null
}> {
  const userId = getActiveUserId()
  if (!userId) return { sum: 0, error: null }

  const { data, error } = await supabase
    .from('tasks')
    .select('xp_reward')
    .eq('user_id', userId)
    .gte('task_date', cetToday())

  if (error) {
    return { sum: 0, error: new Error(error.message) }
  }

  const sum = (Array.isArray(data) ? data : []).reduce(
    (total, row) => total + Math.max(0, Math.floor(Number((row as Record<string, unknown>).xp_reward) || 0)),
    0,
  )
  return { sum, error: null }
}

export async function canEnableIndividualGoalFlags(
  proposed: IndividualGoalFlags,
): Promise<{ allowed: boolean; error: string | null }> {
  const { sum, error } = await sumPlannerTaskPlusXpFromToday()
  if (error) {
    return { allowed: false, error: error.message }
  }
  const budget = taskPlannerPlusXpBudget(proposed)
  if (sum > budget) {
    return { allowed: false, error: PLANNER_TASK_XP_REDUCE_MESSAGE }
  }
  return { allowed: true, error: null }
}
