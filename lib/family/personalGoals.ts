import { cetToday } from '../cetDate'
import { readFamilySession } from '../familySession'
import { supabase } from '../supabase'
import { formatParentDisplayName } from './familyDisplayName'
import type { ParentMember } from './members'
import { isPersonalGoalSymbolId } from './personalGoalSymbols'
import type { ChildProfile } from './types'
import type { MemberXpHistoryKey } from './xpHistory'

export type MemberPersonalGoal = {
  id: string
  familyId: string
  memberKind: 'parent' | 'child'
  memberId: string
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

export type MemberPersonalGoalBarState = {
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
  member_kind: 'parent' | 'child'
  member_id: string
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

function mapGoal(row: GoalRow): MemberPersonalGoal {
  return {
    id: row.id,
    familyId: row.family_id,
    memberKind: row.member_kind,
    memberId: row.member_id,
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

export function isPersonalGoalsTableMissingError(error: { message?: string; code?: string }): boolean {
  return Boolean(
    error.message?.includes('member_personal_goals') ||
      error.message?.includes('schema cache') ||
      error.code === 'PGRST205',
  )
}

export function memberHasLockedPersonalGoals(goals: readonly MemberPersonalGoal[]): boolean {
  return goals.some((goal) => goal.xpLockedAt !== null)
}

export function personalGoalAwaitingXp(goal: MemberPersonalGoal): boolean {
  return goal.xpLockedAt === null && (goal.targetXp === null || goal.targetXp <= 0)
}

export function countPersonalGoalsAwaitingXp(goals: readonly MemberPersonalGoal[]): number {
  return goals.filter(personalGoalAwaitingXp).length
}

export type PersonalGoalAwaitingXpItem = {
  goal: MemberPersonalGoal
  memberKind: 'parent' | 'child'
  memberId: string
  memberLabel: string
  memberHref: string
}

export function memberCanEditPersonalGoals(input: {
  goals: readonly MemberPersonalGoal[]
  isSelf: boolean
  canAdmin: boolean
}): boolean {
  if (!input.isSelf) return false
  if (memberHasLockedPersonalGoals(input.goals)) return input.canAdmin
  return true
}

export function resolveActivePersonalGoalBar(goals: readonly MemberPersonalGoal[]): MemberPersonalGoalBarState | null {
  const withTarget = [...goals]
    .filter((goal) => goal.targetXp !== null && goal.targetXp > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  if (withTarget.length === 0) return null

  const active =
    withTarget.find((goal) => !goal.completedAt && (goal.progressXp < (goal.targetXp ?? 0))) ?? withTarget[withTarget.length - 1]

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

export async function syncMemberPersonalGoalsProgress(
  familyId: string,
  member: MemberXpHistoryKey,
): Promise<Error | null> {
  const { error } = await supabase.rpc('sync_member_personal_goals_progress', {
    p_family_id: familyId,
    p_member_kind: member.memberKind,
    p_member_id: member.memberId,
  })
  if (error) {
    if (isPersonalGoalsTableMissingError(error)) return null
    return new Error(error.message)
  }
  return null
}

export async function syncAllPersonalGoalsForFamily(familyId: string): Promise<Error | null> {
  const { error } = await supabase.rpc('sync_all_personal_goals_for_family', {
    p_family_id: familyId,
  })
  if (error) {
    if (isPersonalGoalsTableMissingError(error)) return null
    return new Error(error.message)
  }
  return null
}

export async function fetchMemberPersonalGoals(
  familyId: string,
  member: MemberXpHistoryKey,
): Promise<{ goals: MemberPersonalGoal[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('member_personal_goals')
    .select('*')
    .eq('family_id', familyId)
    .eq('member_kind', member.memberKind)
    .eq('member_id', member.memberId)
    .order('sort_order', { ascending: true })

  if (error) {
    if (isPersonalGoalsTableMissingError(error)) return { goals: [], error: null }
    return { goals: [], error: new Error(error.message) }
  }

  return { goals: ((data ?? []) as GoalRow[]).map(mapGoal), error: null }
}

export async function fetchMemberPersonalGoalBarState(
  familyId: string,
  member: MemberXpHistoryKey,
): Promise<{ bar: MemberPersonalGoalBarState | null; goals: MemberPersonalGoal[]; error: Error | null }> {
  await syncMemberPersonalGoalsProgress(familyId, member)
  const { goals, error } = await fetchMemberPersonalGoals(familyId, member)
  if (error) return { bar: null, goals: [], error }
  return { bar: resolveActivePersonalGoalBar(goals), goals, error: null }
}

async function ensureTrackingStarted(
  familyId: string,
  member: MemberXpHistoryKey,
): Promise<Error | null> {
  const today = cetToday()
  const { error } = await supabase.from('member_personal_goal_tracking').upsert(
    {
      family_id: familyId,
      member_kind: member.memberKind,
      member_id: member.memberId,
      tracking_started_at: today,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'family_id,member_kind,member_id' },
  )
  if (error) {
    if (isPersonalGoalsTableMissingError(error)) return null
    return new Error(error.message)
  }
  return null
}

export type SaveMemberPersonalGoalsInput = {
  familyId: string
  member: MemberXpHistoryKey
  goals: Array<{ title: string; symbolId: string }>
}

export async function saveMemberPersonalGoals(
  input: SaveMemberPersonalGoalsInput & { canAdmin: boolean },
): Promise<{ goals: MemberPersonalGoal[]; error: Error | null }> {
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

  const { goals: existing, error: fetchError } = await fetchMemberPersonalGoals(input.familyId, input.member)
  if (fetchError) return { goals: [], error: fetchError }

  const isSelf =
    session.memberKind === input.member.memberKind && session.memberId === input.member.memberId

  if (!isSelf) {
    return { goals: [], error: new Error('Ziele können nur vom Mitglied selbst bearbeitet werden.') }
  }

  if (isSelf && !input.canAdmin && memberHasLockedPersonalGoals(existing)) {
    return { goals: [], error: new Error('Ziele sind gesperrt — ein Admin hat schon XP vergeben.') }
  }

  if (input.canAdmin && memberHasLockedPersonalGoals(existing)) {
    const now = new Date().toISOString()
    const lockedByOrder = new Map(existing.filter((g) => g.xpLockedAt).map((g) => [g.sortOrder, g]))
    for (let index = 0; index < trimmed.length; index += 1) {
      const sortOrder = index + 1
      const draft = trimmed[index]!
      const locked = lockedByOrder.get(sortOrder) ?? [...lockedByOrder.values()].find((g) => g.title === draft.title)
      if (locked) {
        const { error: updateError } = await supabase
          .from('member_personal_goals')
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
      .from('member_personal_goals')
      .delete()
      .eq('family_id', input.familyId)
      .eq('member_kind', input.member.memberKind)
      .eq('member_id', input.member.memberId)
      .is('xp_locked_at', null)

    if (deleteUnlockedError) return { goals: [], error: new Error(deleteUnlockedError.message) }

    const lockedRemaining = existing.filter((g) => g.xpLockedAt)
    const insertRows = trimmed
      .map((goal, index) => ({ goal, sortOrder: index + 1 }))
      .filter(({ sortOrder }) => !lockedRemaining.some((locked) => locked.sortOrder === sortOrder))
      .map(({ goal, sortOrder }) => ({
        family_id: input.familyId,
        member_kind: input.member.memberKind,
        member_id: input.member.memberId,
        title: goal.title,
        symbol_id: goal.symbolId,
        sort_order: sortOrder,
        updated_at: now,
      }))

    if (insertRows.length > 0) {
      const { error: insertError } = await supabase.from('member_personal_goals').insert(insertRows)
      if (insertError) return { goals: [], error: new Error(insertError.message) }
    }

    return fetchMemberPersonalGoals(input.familyId, input.member)
  }

  const { error: deleteError } = await supabase
    .from('member_personal_goals')
    .delete()
    .eq('family_id', input.familyId)
    .eq('member_kind', input.member.memberKind)
    .eq('member_id', input.member.memberId)

  if (deleteError) {
    if (isPersonalGoalsTableMissingError(deleteError)) {
      return {
        goals: [],
        error: new Error(
          'Persönliche Ziele benötigen die SQL-Migration — supabase/member_personal_goals_migration.sql ausführen.',
        ),
      }
    }
    return { goals: [], error: new Error(deleteError.message) }
  }

  const now = new Date().toISOString()
  const rows = trimmed.map((goal, index) => ({
    family_id: input.familyId,
    member_kind: input.member.memberKind,
    member_id: input.member.memberId,
    title: goal.title,
    symbol_id: goal.symbolId,
    sort_order: index + 1,
    updated_at: now,
  }))

  const { error: insertError } = await supabase.from('member_personal_goals').insert(rows)
  if (insertError) return { goals: [], error: new Error(insertError.message) }

  return fetchMemberPersonalGoals(input.familyId, input.member)
}

export async function reorderMemberPersonalGoals(
  familyId: string,
  member: MemberXpHistoryKey,
  orderedGoalIds: string[],
  canAdmin: boolean,
): Promise<{ error: Error | null }> {
  const session = readFamilySession()
  if (!session) return { error: new Error('Bitte zuerst anmelden.') }

  const { goals, error: fetchError } = await fetchMemberPersonalGoals(familyId, member)
  if (fetchError) return { error: fetchError }

  const isSelf = session.memberKind === member.memberKind && session.memberId === member.memberId
  if (!memberCanEditPersonalGoals({ goals, isSelf, canAdmin })) {
    return { error: new Error('Ziele können gerade nicht sortiert werden.') }
  }

  if (orderedGoalIds.length !== goals.length) {
    return { error: new Error('Ungültige Reihenfolge.') }
  }

  const now = new Date().toISOString()
  for (let index = 0; index < orderedGoalIds.length; index += 1) {
    const goalId = orderedGoalIds[index]!
    const { error } = await supabase
      .from('member_personal_goals')
      .update({ sort_order: index + 1, updated_at: now })
      .eq('id', goalId)
      .eq('family_id', familyId)
    if (error) return { error: new Error(error.message) }
  }

  return { error: null }
}

export async function assignPersonalGoalXp(input: {
  familyId: string
  member: MemberXpHistoryKey
  goalId: string
  targetXp: number
  canAdmin: boolean
}): Promise<{ error: Error | null }> {
  if (!input.canAdmin) return { error: new Error('Nur Admins können XP für Ziele vergeben.') }

  const xp = Math.floor(input.targetXp)
  if (xp < 1 || xp > 999) return { error: new Error('XP zwischen 1 und 999 eingeben.') }

  const trackingError = await ensureTrackingStarted(input.familyId, input.member)
  if (trackingError) return { error: trackingError }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('member_personal_goals')
    .update({
      target_xp: xp,
      xp_locked_at: now,
      progress_xp: 0,
      completed_at: null,
      updated_at: now,
    })
    .eq('id', input.goalId)
    .eq('family_id', input.familyId)
    .eq('member_kind', input.member.memberKind)
    .eq('member_id', input.member.memberId)

  if (error) {
    if (isPersonalGoalsTableMissingError(error)) {
      return {
        error: new Error(
          'Persönliche Ziele benötigen die SQL-Migration — supabase/member_personal_goals_migration.sql ausführen.',
        ),
      }
    }
    return { error: new Error(error.message) }
  }

  await syncMemberPersonalGoalsProgress(input.familyId, input.member)
  return { error: null }
}

export async function deleteMemberPersonalGoal(input: {
  familyId: string
  member: MemberXpHistoryKey
  goalId: string
  canAdmin: boolean
}): Promise<{ error: Error | null }> {
  const session = readFamilySession()
  if (!session) return { error: new Error('Bitte zuerst anmelden.') }

  const { goals, error: fetchError } = await fetchMemberPersonalGoals(input.familyId, input.member)
  if (fetchError) return { error: fetchError }

  const goal = goals.find((row) => row.id === input.goalId)
  if (!goal) return { error: new Error('Ziel nicht gefunden.') }

  const isSelf = session.memberKind === input.member.memberKind && session.memberId === input.member.memberId
  if (!isSelf) {
    return { error: new Error('Ziele können nur vom Mitglied selbst bearbeitet werden.') }
  }
  if (goal.xpLockedAt && !input.canAdmin) {
    return { error: new Error('Gesperrte Ziele kann nur ein Admin löschen.') }
  }
  if (!memberCanEditPersonalGoals({ goals, isSelf, canAdmin: input.canAdmin })) {
    return { error: new Error('Keine Berechtigung.') }
  }

  const { error } = await supabase
    .from('member_personal_goals')
    .delete()
    .eq('id', input.goalId)
    .eq('family_id', input.familyId)

  if (error) return { error: new Error(error.message) }

  const remaining = goals.filter((row) => row.id !== input.goalId).sort((a, b) => a.sortOrder - b.sortOrder)
  const now = new Date().toISOString()
  for (let index = 0; index < remaining.length; index += 1) {
    await supabase
      .from('member_personal_goals')
      .update({ sort_order: index + 1, updated_at: now })
      .eq('id', remaining[index]!.id)
  }

  await syncMemberPersonalGoalsProgress(input.familyId, input.member)
  return { error: null }
}

export async function updatePersonalGoalXp(input: {
  familyId: string
  member: MemberXpHistoryKey
  goalId: string
  targetXp: number
  canAdmin: boolean
}): Promise<{ error: Error | null }> {
  if (!input.canAdmin) return { error: new Error('Nur Admins können XP ändern.') }

  const xp = Math.floor(input.targetXp)
  if (xp < 1 || xp > 999) return { error: new Error('XP zwischen 1 und 999 eingeben.') }

  const { error } = await supabase
    .from('member_personal_goals')
    .update({ target_xp: xp, updated_at: new Date().toISOString() })
    .eq('id', input.goalId)
    .eq('family_id', input.familyId)

  if (error) return { error: new Error(error.message) }

  await syncMemberPersonalGoalsProgress(input.familyId, input.member)
  return { error: null }
}

function memberHref(memberKind: 'parent' | 'child', memberId: string): string {
  return memberKind === 'child' ? `/children/${memberId}` : `/parents/${memberId}`
}

export async function fetchFamilyPersonalGoalsAwaitingXp(
  familyId: string,
  parents: ParentMember[],
  children: ChildProfile[],
): Promise<{ items: PersonalGoalAwaitingXpItem[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('member_personal_goals')
    .select('*')
    .eq('family_id', familyId)
    .is('xp_locked_at', null)
    .or('target_xp.is.null,target_xp.lte.0')
    .order('sort_order', { ascending: true })

  if (error) {
    if (isPersonalGoalsTableMissingError(error)) return { items: [], error: null }
    return { items: [], error: new Error(error.message) }
  }

  const items: PersonalGoalAwaitingXpItem[] = []
  for (const row of (data ?? []) as GoalRow[]) {
    const goal = mapGoal(row)
    if (!personalGoalAwaitingXp(goal)) continue

    const memberKind = row.member_kind
    const memberId = row.member_id as string
    let memberLabel = 'Familienmitglied'
    if (memberKind === 'child') {
      memberLabel = children.find((c) => c.id === memberId)?.display_name?.trim() || 'Kind'
    } else {
      const parent = parents.find((p) => p.id === memberId)
      memberLabel = parent ? formatParentDisplayName(parent.display_name, parent.gender) : 'Erwachsene'
    }

    items.push({
      goal,
      memberKind,
      memberId,
      memberLabel,
      memberHref: memberHref(memberKind, memberId),
    })
  }

  items.sort(
    (a, b) =>
      a.memberLabel.localeCompare(b.memberLabel, 'de') ||
      a.goal.sortOrder - b.goal.sortOrder ||
      a.goal.title.localeCompare(b.goal.title, 'de'),
  )

  return { items, error: null }
}
