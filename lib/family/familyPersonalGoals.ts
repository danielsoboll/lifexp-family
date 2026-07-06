import { cetToday } from '../cetDate'
import { readFamilySession } from '../familySession'
import { supabase } from '../supabase'
import { isPersonalGoalSymbolId } from './personalGoalSymbols'

export type FamilyPersonalGoal = {
  id: string
  familyId: string
  title: string
  symbolId: string
  sortOrder: number
  targetXp: number | null
  xpLockedAt: string | null
  progressXp: number
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type FamilyPersonalGoalBarState = {
  showBar: boolean
  progress: number
  target: number
  symbolId: string
  title: string
  goalId: string
}

type GoalRow = {
  id: string
  family_id: string
  title: string
  symbol_id: string
  sort_order: number
  target_xp: number | null
  xp_locked_at: string | null
  progress_xp: number
  completed_at: string | null
  created_at: string
  updated_at: string
}

function mapGoal(row: GoalRow): FamilyPersonalGoal {
  return {
    id: row.id,
    familyId: row.family_id,
    title: row.title,
    symbolId: row.symbol_id,
    sortOrder: row.sort_order,
    targetXp: row.target_xp,
    xpLockedAt: row.xp_locked_at,
    progressXp: row.progress_xp,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function isFamilyPersonalGoalsTableMissingError(error: { message?: string; code?: string }): boolean {
  return Boolean(
    error.message?.includes('family_personal_goals') ||
      error.message?.includes('schema cache') ||
      error.code === 'PGRST205',
  )
}

export function familyHasLockedPersonalGoals(goals: readonly FamilyPersonalGoal[]): boolean {
  return goals.some((goal) => goal.xpLockedAt !== null)
}

export function familyPersonalGoalAwaitingXp(goal: FamilyPersonalGoal): boolean {
  return goal.xpLockedAt === null && (goal.targetXp === null || goal.targetXp <= 0)
}

export function countFamilyPersonalGoalsAwaitingXp(goals: readonly FamilyPersonalGoal[]): number {
  return goals.filter(familyPersonalGoalAwaitingXp).length
}

export function familyCanEditPersonalGoals(input: {
  goals: readonly FamilyPersonalGoal[]
  canAdmin: boolean
}): boolean {
  if (input.canAdmin) return true
  return !familyHasLockedPersonalGoals(input.goals)
}

export function resolveActiveFamilyPersonalGoalBar(
  goals: readonly FamilyPersonalGoal[],
): FamilyPersonalGoalBarState | null {
  const withTarget = [...goals]
    .filter((goal) => goal.targetXp !== null && goal.targetXp > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  if (withTarget.length === 0) return null

  const active =
    withTarget.find((goal) => !goal.completedAt && goal.progressXp < (goal.targetXp ?? 0)) ??
    withTarget[withTarget.length - 1]

  if (!active?.targetXp) return null

  return {
    showBar: true,
    progress: Math.min(active.progressXp, active.targetXp),
    target: active.targetXp,
    symbolId: active.symbolId,
    title: active.title,
    goalId: active.id,
  }
}

export async function syncFamilyPersonalGoalsProgress(familyId: string): Promise<Error | null> {
  const { error } = await supabase.rpc('sync_family_personal_goals_progress', {
    p_family_id: familyId,
  })
  if (error) {
    if (isFamilyPersonalGoalsTableMissingError(error)) return null
    return new Error(error.message)
  }
  return null
}

export async function fetchFamilyPersonalGoals(
  familyId: string,
): Promise<{ goals: FamilyPersonalGoal[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('family_personal_goals')
    .select('*')
    .eq('family_id', familyId)
    .order('sort_order', { ascending: true })

  if (error) {
    if (isFamilyPersonalGoalsTableMissingError(error)) return { goals: [], error: null }
    return { goals: [], error: new Error(error.message) }
  }

  return { goals: ((data ?? []) as GoalRow[]).map(mapGoal), error: null }
}

export async function fetchFamilyPersonalGoalBarState(familyId: string): Promise<{
  bar: FamilyPersonalGoalBarState | null
  goals: FamilyPersonalGoal[]
  error: Error | null
}> {
  await syncFamilyPersonalGoalsProgress(familyId)
  const { goals, error } = await fetchFamilyPersonalGoals(familyId)
  if (error) return { bar: null, goals: [], error }
  return { bar: resolveActiveFamilyPersonalGoalBar(goals), goals, error: null }
}

async function ensureFamilyTrackingStarted(familyId: string): Promise<Error | null> {
  const today = cetToday()
  const { error } = await supabase.from('family_personal_goal_tracking').upsert(
    {
      family_id: familyId,
      tracking_started_at: today,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'family_id' },
  )
  if (error) {
    if (isFamilyPersonalGoalsTableMissingError(error)) return null
    return new Error(error.message)
  }
  return null
}

export type SaveFamilyPersonalGoalsInput = {
  familyId: string
  goals: Array<{ title: string; symbolId: string }>
}

export async function saveFamilyPersonalGoals(
  input: SaveFamilyPersonalGoalsInput & { canAdmin: boolean },
): Promise<{ goals: FamilyPersonalGoal[]; error: Error | null }> {
  const session = readFamilySession()
  if (!session) return { goals: [], error: new Error('Bitte zuerst anmelden.') }

  const trimmed = input.goals
    .map((goal) => ({
      title: goal.title.trim(),
      symbolId: goal.symbolId,
    }))
    .filter((goal) => goal.title.length > 0)

  if (trimmed.length === 0) {
    return { goals: [], error: new Error('Bitte mindestens ein Ziel eintragen.') }
  }

  for (const goal of trimmed) {
    if (!isPersonalGoalSymbolId(goal.symbolId)) {
      return { goals: [], error: new Error('Bitte ein Symbol wählen.') }
    }
  }

  const { goals: existing, error: fetchError } = await fetchFamilyPersonalGoals(input.familyId)
  if (fetchError) return { goals: [], error: fetchError }

  if (!input.canAdmin && familyHasLockedPersonalGoals(existing)) {
    return { goals: [], error: new Error('Familienziele sind gesperrt — ein Admin hat schon XP vergeben.') }
  }

  if (input.canAdmin && familyHasLockedPersonalGoals(existing)) {
    const now = new Date().toISOString()
    const lockedByOrder = new Map(existing.filter((g) => g.xpLockedAt).map((g) => [g.sortOrder, g]))
    for (let index = 0; index < trimmed.length; index += 1) {
      const sortOrder = index + 1
      const draft = trimmed[index]!
      const locked = lockedByOrder.get(sortOrder) ?? [...lockedByOrder.values()].find((g) => g.title === draft.title)
      if (locked) {
        const { error: updateError } = await supabase
          .from('family_personal_goals')
          .update({
            title: draft.title,
            symbol_id: draft.symbolId,
            sort_order: sortOrder,
            updated_at: now,
          })
          .eq('id', locked.id)
        if (updateError) return { goals: [], error: new Error(updateError.message) }
        lockedByOrder.delete(locked.sortOrder)
      }
    }

    const { error: deleteUnlockedError } = await supabase
      .from('family_personal_goals')
      .delete()
      .eq('family_id', input.familyId)
      .is('xp_locked_at', null)

    if (deleteUnlockedError) return { goals: [], error: new Error(deleteUnlockedError.message) }

    const lockedRemaining = existing.filter((g) => g.xpLockedAt)
    const insertRows = trimmed
      .map((goal, index) => ({ goal, sortOrder: index + 1 }))
      .filter(({ sortOrder }) => !lockedRemaining.some((locked) => locked.sortOrder === sortOrder))
      .map(({ goal, sortOrder }) => ({
        family_id: input.familyId,
        title: goal.title,
        symbol_id: goal.symbolId,
        sort_order: sortOrder,
        updated_at: now,
      }))

    if (insertRows.length > 0) {
      const { error: insertError } = await supabase.from('family_personal_goals').insert(insertRows)
      if (insertError) return { goals: [], error: new Error(insertError.message) }
    }

    return fetchFamilyPersonalGoals(input.familyId)
  }

  const { error: deleteError } = await supabase
    .from('family_personal_goals')
    .delete()
    .eq('family_id', input.familyId)

  if (deleteError) {
    if (isFamilyPersonalGoalsTableMissingError(deleteError)) {
      return {
        goals: [],
        error: new Error(
          'Familienziele benötigen die SQL-Migration — supabase/family_personal_goals_migration.sql ausführen.',
        ),
      }
    }
    return { goals: [], error: new Error(deleteError.message) }
  }

  const now = new Date().toISOString()
  const rows = trimmed.map((goal, index) => ({
    family_id: input.familyId,
    title: goal.title,
    symbol_id: goal.symbolId,
    sort_order: index + 1,
    updated_at: now,
  }))

  const { error: insertError } = await supabase.from('family_personal_goals').insert(rows)
  if (insertError) return { goals: [], error: new Error(insertError.message) }

  return fetchFamilyPersonalGoals(input.familyId)
}

export async function reorderFamilyPersonalGoals(
  familyId: string,
  orderedGoalIds: string[],
  canAdmin: boolean,
): Promise<{ error: Error | null }> {
  const session = readFamilySession()
  if (!session) return { error: new Error('Bitte zuerst anmelden.') }

  const { goals, error: fetchError } = await fetchFamilyPersonalGoals(familyId)
  if (fetchError) return { error: fetchError }

  if (!familyCanEditPersonalGoals({ goals, canAdmin })) {
    return { error: new Error('Familienziele können gerade nicht sortiert werden.') }
  }

  if (orderedGoalIds.length !== goals.length) {
    return { error: new Error('Ungültige Reihenfolge.') }
  }

  const now = new Date().toISOString()
  for (let index = 0; index < orderedGoalIds.length; index += 1) {
    const goalId = orderedGoalIds[index]!
    const { error } = await supabase
      .from('family_personal_goals')
      .update({ sort_order: index + 1, updated_at: now })
      .eq('id', goalId)
      .eq('family_id', familyId)
    if (error) return { error: new Error(error.message) }
  }

  return { error: null }
}

export async function assignFamilyPersonalGoalXp(input: {
  familyId: string
  goalId: string
  targetXp: number
  canAdmin: boolean
}): Promise<{ error: Error | null }> {
  if (!input.canAdmin) return { error: new Error('Nur Admins können XP für Familienziele vergeben.') }

  const xp = Math.floor(input.targetXp)
  if (xp < 1 || xp > 999) return { error: new Error('XP zwischen 1 und 999 eingeben.') }

  const trackingError = await ensureFamilyTrackingStarted(input.familyId)
  if (trackingError) return { error: trackingError }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('family_personal_goals')
    .update({
      target_xp: xp,
      xp_locked_at: now,
      progress_xp: 0,
      completed_at: null,
      updated_at: now,
    })
    .eq('id', input.goalId)
    .eq('family_id', input.familyId)

  if (error) {
    if (isFamilyPersonalGoalsTableMissingError(error)) {
      return {
        error: new Error(
          'Familienziele benötigen die SQL-Migration — supabase/family_personal_goals_migration.sql ausführen.',
        ),
      }
    }
    return { error: new Error(error.message) }
  }

  await syncFamilyPersonalGoalsProgress(input.familyId)
  return { error: null }
}

export async function updateFamilyPersonalGoalXp(input: {
  familyId: string
  goalId: string
  targetXp: number
  canAdmin: boolean
}): Promise<{ error: Error | null }> {
  if (!input.canAdmin) return { error: new Error('Nur Admins können XP ändern.') }

  const xp = Math.floor(input.targetXp)
  if (xp < 1 || xp > 999) return { error: new Error('XP zwischen 1 und 999 eingeben.') }

  const { error } = await supabase
    .from('family_personal_goals')
    .update({ target_xp: xp, updated_at: new Date().toISOString() })
    .eq('id', input.goalId)
    .eq('family_id', input.familyId)

  if (error) return { error: new Error(error.message) }

  await syncFamilyPersonalGoalsProgress(input.familyId)
  return { error: null }
}

export async function deleteFamilyPersonalGoal(input: {
  familyId: string
  goalId: string
  canAdmin: boolean
}): Promise<{ error: Error | null }> {
  const session = readFamilySession()
  if (!session) return { error: new Error('Bitte zuerst anmelden.') }

  const { goals, error: fetchError } = await fetchFamilyPersonalGoals(input.familyId)
  if (fetchError) return { error: fetchError }

  const goal = goals.find((row) => row.id === input.goalId)
  if (!goal) return { error: new Error('Ziel nicht gefunden.') }

  if (goal.xpLockedAt && !input.canAdmin) {
    return { error: new Error('Gesperrte Ziele kann nur ein Admin löschen.') }
  }
  if (!familyCanEditPersonalGoals({ goals, canAdmin: input.canAdmin }) && !input.canAdmin) {
    return { error: new Error('Keine Berechtigung.') }
  }

  const { error } = await supabase
    .from('family_personal_goals')
    .delete()
    .eq('id', input.goalId)
    .eq('family_id', input.familyId)

  if (error) return { error: new Error(error.message) }

  const remaining = goals.filter((row) => row.id !== input.goalId).sort((a, b) => a.sortOrder - b.sortOrder)
  const now = new Date().toISOString()
  for (let index = 0; index < remaining.length; index += 1) {
    await supabase
      .from('family_personal_goals')
      .update({ sort_order: index + 1, updated_at: now })
      .eq('id', remaining[index]!.id)
  }

  await syncFamilyPersonalGoalsProgress(input.familyId)
  return { error: null }
}

export async function fetchFamilyPersonalGoalsAwaitingXpList(
  familyId: string,
): Promise<{ goals: FamilyPersonalGoal[]; error: Error | null }> {
  const { goals, error } = await fetchFamilyPersonalGoals(familyId)
  if (error) return { goals: [], error }
  return {
    goals: goals.filter(familyPersonalGoalAwaitingXp),
    error: null,
  }
}
