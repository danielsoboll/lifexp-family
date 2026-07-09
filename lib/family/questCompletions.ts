import { cetToday, normalizeDateKey } from '../cetDate'
import { getStoredParentId, readFamilySession, type FamilySession } from '../familySession'
import { supabase } from '../supabase'
import { assertFamilyAdminSession, resyncFamilyXpHistoryForDate } from './admin'
import { fetchQuestAssignmentsForQuests, questAppliesToAssignee } from './questAssignments'
import { sessionIsQuestCreator, assigneeDisplayNameFromCompletion, isCompletionForSessionMember, canSessionConfirmQuestCompletion } from './questConfirmation'
import { enrichQuestCreatorFromRecurringTemplate } from './recurringQuests'
import { formatParentDisplayName } from './familyDisplayName'
import { fetchMemberXpBudget } from './questXpBudget'
import { clampQuestXp, isQuestExpired } from './questRules'
import type { ParentMember } from './members'
import type { ChildWithTodayXp, PendingCreatorConfirmation, Quest } from './types'
import { recordDailyXpEntry } from './xp'
import type { AvatarPortraitId } from './memberAvatar'
import { saveQuestCompletionCreatorReaction } from './questCompletionPlus'

async function validateSessionOwnsQuest(input: {
  quest: Quest
  memberType: 'parent' | 'child'
  memberId: string
}): Promise<Error | null> {
  const session = readFamilySession()
  if (!session) return new Error('Bitte zuerst anmelden.')
  if (session.memberKind !== input.memberType || session.memberId !== input.memberId) {
    return new Error('Du kannst nur deine eigenen Quests erledigen.')
  }

  const { assignmentsByQuest, error } = await fetchQuestAssignmentsForQuests([input.quest.id])
  if (error) return error

  const assignees = assignmentsByQuest.get(input.quest.id) ?? []
  if (!questAppliesToAssignee(input.quest.child_id, assignees, input.memberType, input.memberId)) {
    return new Error('Diese Quest ist dir nicht zugewiesen.')
  }

  return null
}

async function validateCompletionBudget(input: {
  familyId: string
  memberType: 'parent' | 'child'
  memberId: string
  quest: Quest
  xpAwarded: number
}): Promise<Error | null> {
  const taskDate = normalizeDateKey(input.quest.task_date)
  if (!taskDate) return new Error('Quest ohne gültiges Datum.')

  if (isQuestExpired(taskDate)) {
    return new Error('Diese Quest ist abgelaufen und kann nicht mehr erledigt werden.')
  }

  const today = cetToday()
  if (taskDate > today) {
    return new Error('Diese Quest kann erst am geplanten Tag erledigt werden.')
  }

  const { budget, error } = await fetchMemberXpBudget({
    familyId: input.familyId,
    memberType: input.memberType,
    memberId: input.memberId,
    taskDate,
    excludeQuestId: input.quest.id,
  })
  if (error) return error
  if (budget.remainingXp < input.xpAwarded) {
    return new Error(`Tageslimit erreicht — maximal ${budget.maxXp} XP pro Tag.`)
  }
  return null
}

type AssigneeConfirmResult = { error: Error | null; creatorConfirmed: boolean; completionId: string | null }

async function tryAutoConfirmCreatorOwnFamilyQuest(
  quest: Quest,
  completionId: string,
  memberType: 'parent' | 'child',
  memberId: string,
): Promise<{ creatorConfirmed: boolean; error: Error | null }> {
  const session = readFamilySession()
  if (!session || !sessionIsQuestCreator(quest, session)) {
    return { creatorConfirmed: false, error: null }
  }
  if (session.memberKind !== memberType || session.memberId !== memberId) {
    return { creatorConfirmed: false, error: null }
  }

  const { assignmentsByQuest, error: assignError } = await fetchQuestAssignmentsForQuests([quest.id])
  if (assignError) return { creatorConfirmed: false, error: assignError }
  if ((assignmentsByQuest.get(quest.id)?.length ?? 0) <= 1) {
    return { creatorConfirmed: false, error: null }
  }

  const { error } = await confirmQuestByCreator(completionId, { allowSelfAssignee: true })
  return { creatorConfirmed: !error, error }
}

export async function confirmQuestByAssigneeChild(input: {
  quest: Quest
  childId: string
  familyId: string
  entryDate?: string
}): Promise<AssigneeConfirmResult> {
  const entryDate = normalizeDateKey(input.entryDate ?? input.quest.task_date)
  const now = new Date().toISOString()

  const ownershipError = await validateSessionOwnsQuest({
    quest: input.quest,
    memberType: 'child',
    memberId: input.childId,
  })
  if (ownershipError) return { error: ownershipError, creatorConfirmed: false, completionId: null }

  const budgetError = await validateCompletionBudget({
    familyId: input.familyId,
    memberType: 'child',
    memberId: input.childId,
    quest: input.quest,
    xpAwarded: clampQuestXp(input.quest.xp_reward),
  })
  if (budgetError) return { error: budgetError, creatorConfirmed: false, completionId: null }

  const { data: inserted, error: completionError } = await supabase
    .from('quest_completions')
    .insert({
      quest_id: input.quest.id,
      child_id: input.childId,
      family_id: input.familyId,
      completed_on: entryDate,
      xp_awarded: 0,
      assignee_confirmed_at: now,
      creator_confirmed_at: null,
      completed_by: getStoredParentId(),
    })
    .select('id')
    .single()

  if (completionError) {
    if (completionError.code === '23505') {
      return { error: new Error('Diese Quest wurde an diesem Tag schon gemeldet.'), creatorConfirmed: false, completionId: null }
    }
    return { error: new Error(completionError.message), creatorConfirmed: false, completionId: null }
  }

  if (!inserted?.id) return { error: null, creatorConfirmed: false, completionId: null }

  const completionId = inserted.id as string

  const auto = await tryAutoConfirmCreatorOwnFamilyQuest(
    input.quest,
    completionId,
    'child',
    input.childId,
  )
  if (auto.error) return { error: auto.error, creatorConfirmed: false, completionId }
  return { error: null, creatorConfirmed: auto.creatorConfirmed, completionId }
}

export async function confirmQuestByAssigneeParent(input: {
  quest: Quest
  parentId: string
  familyId: string
  entryDate?: string
}): Promise<AssigneeConfirmResult> {
  const entryDate = normalizeDateKey(input.entryDate ?? input.quest.task_date)
  const now = new Date().toISOString()

  const ownershipError = await validateSessionOwnsQuest({
    quest: input.quest,
    memberType: 'parent',
    memberId: input.parentId,
  })
  if (ownershipError) return { error: ownershipError, creatorConfirmed: false, completionId: null }

  const budgetError = await validateCompletionBudget({
    familyId: input.familyId,
    memberType: 'parent',
    memberId: input.parentId,
    quest: input.quest,
    xpAwarded: clampQuestXp(input.quest.xp_reward),
  })
  if (budgetError) return { error: budgetError, creatorConfirmed: false, completionId: null }

  const { data: inserted, error: completionError } = await supabase
    .from('quest_completions')
    .insert({
      quest_id: input.quest.id,
      parent_id: input.parentId,
      family_id: input.familyId,
      completed_on: entryDate,
      xp_awarded: 0,
      assignee_confirmed_at: now,
      creator_confirmed_at: null,
      completed_by: getStoredParentId(),
    })
    .select('id')
    .single()

  if (completionError) {
    if (completionError.code === '23505') {
      return { error: new Error('Diese Quest wurde an diesem Tag schon gemeldet.'), creatorConfirmed: false, completionId: null }
    }
    return { error: new Error(completionError.message), creatorConfirmed: false, completionId: null }
  }

  if (!inserted?.id) return { error: null, creatorConfirmed: false, completionId: null }

  const completionId = inserted.id as string

  const auto = await tryAutoConfirmCreatorOwnFamilyQuest(
    input.quest,
    completionId,
    'parent',
    input.parentId,
  )
  if (auto.error) return { error: auto.error, creatorConfirmed: false, completionId }
  return { error: null, creatorConfirmed: auto.creatorConfirmed, completionId }
}

/** @deprecated Alias */
export const completeQuestForChild = confirmQuestByAssigneeChild
/** @deprecated Alias */
export const completeQuestForParent = confirmQuestByAssigneeParent

async function resolveSessionIsQuestCreator(quest: Quest, session: FamilySession): Promise<boolean> {
  if (sessionIsQuestCreator(quest, session)) return true
  const enriched = await enrichQuestCreatorFromRecurringTemplate(quest)
  return sessionIsQuestCreator(enriched, session)
}

export async function confirmQuestByCreator(
  completionId: string,
  options: {
    allowSelfAssignee?: boolean
    reaction?: { message: string; portraitId: string } | null
  } = {},
): Promise<{
  error: Error | null
  xpAwarded?: number
  assigneeChildId?: string | null
  assigneeParentId?: string | null
}> {
  const session = readFamilySession()
  if (!session) return { error: new Error('Bitte zuerst anmelden.') }

  const { data: row, error: fetchError } = await supabase
    .from('quest_completions')
    .select(
      'id, quest_id, child_id, parent_id, family_id, completed_on, assignee_confirmed_at, creator_confirmed_at, quests(id, title, xp_reward, task_date, created_by, created_by_child_id, family_id, recurring_template_id)',
    )
    .eq('id', completionId)
    .maybeSingle()

  if (fetchError) return { error: new Error(fetchError.message) }
  if (!row) return { error: new Error('Quest-Abschluss nicht gefunden.') }

  if (!row.assignee_confirmed_at) {
    return { error: new Error('Die Quest wurde noch nicht als erledigt gemeldet.') }
  }
  if (row.creator_confirmed_at) {
    return { error: new Error('Diese Quest wurde schon bestätigt.') }
  }

  const questRaw = row.quests as Quest | Quest[] | null
  const quest = Array.isArray(questRaw) ? questRaw[0] ?? null : questRaw
  if (!quest) return { error: new Error('Quest nicht gefunden.') }

  const childId = row.child_id as string | null
  const parentId = row.parent_id as string | null
  const familyId = row.family_id as string

  if (
    !options.allowSelfAssignee &&
    isCompletionForSessionMember(session, childId, parentId)
  ) {
    return { error: new Error('Eigene Erledigung bestätigst du nicht selbst — nur andere Familienmitglieder.') }
  }

  const isCreator = await resolveSessionIsQuestCreator(quest, session)
  if (!isCreator) {
    const adminError = await assertFamilyAdminSession(familyId)
    if (adminError.error) {
      return { error: new Error('Nur der Quest-Ersteller oder ein Admin kann die Quest bestätigen.') }
    }
  }

  const xpAwarded = clampQuestXp(quest.xp_reward)
  const entryDate = normalizeDateKey(row.completed_on as string)

  const now = new Date().toISOString()

  const memberType = childId ? 'child' : 'parent'
  const memberId = childId ?? parentId
  if (!memberId) return { error: new Error('Ungültiger Quest-Abschluss.') }

  const budgetError = await validateCompletionBudget({
    familyId,
    memberType,
    memberId,
    quest,
    xpAwarded,
  })
  if (budgetError) return { error: budgetError }

  const creatorParentId = session.memberKind === 'parent' ? session.memberId : null
  const creatorChildId = session.memberKind === 'child' ? session.memberId : null

  const { error: updateError } = await supabase
    .from('quest_completions')
    .update({
      creator_confirmed_at: now,
      creator_confirmed_by_parent_id: creatorParentId,
      creator_confirmed_by_child_id: creatorChildId,
      xp_awarded: xpAwarded,
      completed_at: now,
    })
    .eq('id', completionId)
    .is('creator_confirmed_at', null)

  if (updateError) return { error: new Error(updateError.message) }

  if (childId) {
    const xpError = await recordDailyXpEntry({
      familyId,
      childId,
      entryDate,
      source: 'quest',
      sourceId: quest.id,
      xpAmount: xpAwarded,
      metadata: { quest_completion_id: completionId, quest_title: quest.title },
    })
    if (xpError) return { error: xpError }
  }

  if (options.reaction?.message.trim() && options.reaction.portraitId) {
    const reactionError = await saveQuestCompletionCreatorReaction({
      familyId,
      completionId,
      message: options.reaction.message,
      portraitId: options.reaction.portraitId as AvatarPortraitId,
      creatorKind: session.memberKind,
      creatorParentId: session.memberKind === 'parent' ? session.memberId : null,
      creatorChildId: session.memberKind === 'child' ? session.memberId : null,
    })
    if (reactionError.error) return { error: reactionError.error }
  }

  return { error: null, xpAwarded, assigneeChildId: childId, assigneeParentId: parentId }
}

export async function fetchPendingCreatorConfirmations(
  familyId: string,
  parents: ReadonlyArray<ParentMember>,
  children: ReadonlyArray<ChildWithTodayXp>,
  canAdmin: boolean,
): Promise<{ items: PendingCreatorConfirmation[]; error: Error | null }> {
  const session = readFamilySession()
  if (!session) return { items: [], error: null }

  const { data, error } = await supabase
    .from('quest_completions')
    .select(
      'id, assignee_confirmed_at, child_id, parent_id, completed_on, quests(id, title, xp_reward, task_date, created_by, created_by_child_id, family_id, recurring_template_id)',
    )
    .eq('family_id', familyId)
    .not('assignee_confirmed_at', 'is', null)
    .is('creator_confirmed_at', null)
    .order('assignee_confirmed_at', { ascending: true })

  if (error) return { items: [], error: new Error(error.message) }

  const items: PendingCreatorConfirmation[] = []
  for (const row of data ?? []) {
    const questRaw = row.quests as Quest | Quest[] | null
    let quest = Array.isArray(questRaw) ? questRaw[0] ?? null : questRaw
    if (!quest) continue
    quest = await enrichQuestCreatorFromRecurringTemplate(quest)
    const assigneeConfirmedAt = row.assignee_confirmed_at as string
    if (!assigneeConfirmedAt) continue

    if (
      !canSessionConfirmQuestCompletion({
        quest,
        session,
        assigneeChildId: row.child_id as string | null,
        assigneeParentId: row.parent_id as string | null,
        canAdmin,
      })
    ) {
      continue
    }

    items.push({
      completionId: row.id as string,
      questId: quest.id,
      questTitle: quest.title,
      xpReward: quest.xp_reward,
      taskDate: normalizeDateKey(quest.task_date),
      assigneeName: assigneeDisplayNameFromCompletion(
        row.child_id as string | null,
        row.parent_id as string | null,
        parents,
        children,
        formatParentDisplayName,
      ),
      assigneeConfirmedAt,
    })
  }

  return { items, error: null }
}

export async function fetchFamilyHistory(
  familyId: string,
  limit = 40,
): Promise<{
  entries: Array<{
    id: string
    kind: 'quest' | 'xp'
    title: string
    subtitle: string
    date: string
    xp: number
    memberKind: 'parent' | 'child' | null
    memberId: string | null
  }>
  error: Error | null
}> {
  const [{ data: completions, error: cErr }, { data: xpRows, error: xErr }] = await Promise.all([
    supabase
      .from('quest_completions')
      .select('id, completed_on, xp_awarded, quest_id, child_id, parent_id, creator_confirmed_at, quests(title)')
      .eq('family_id', familyId)
      .not('creator_confirmed_at', 'is', null)
      .order('creator_confirmed_at', { ascending: false })
      .limit(limit),
    supabase
      .from('daily_xp_entries')
      .select('id, entry_date, xp_amount, source, child_id')
      .eq('family_id', familyId)
      .order('entry_date', { ascending: false })
      .limit(limit),
  ])

  if (cErr) return { entries: [], error: new Error(cErr.message) }
  if (xErr) return { entries: [], error: new Error(xErr.message) }

  const entries: Array<{
    id: string
    kind: 'quest' | 'xp'
    title: string
    subtitle: string
    date: string
    xp: number
    memberKind: 'parent' | 'child' | null
    memberId: string | null
  }> = []

  for (const row of completions ?? []) {
    const questTitle = (row.quests as { title?: string } | null)?.title ?? 'Quest'
    const childId = row.child_id as string | null
    const parentId = row.parent_id as string | null
    entries.push({
      id: `q-${row.id as string}`,
      kind: 'quest',
      title: questTitle,
      subtitle: childId ? 'Quest (Kind)' : 'Quest (Elternteil)',
      date: row.completed_on as string,
      xp: row.xp_awarded as number,
      memberKind: childId ? 'child' : parentId ? 'parent' : null,
      memberId: childId ?? parentId,
    })
  }

  for (const row of xpRows ?? []) {
    entries.push({
      id: `x-${row.id as string}`,
      kind: 'xp',
      title: `XP (${row.source as string})`,
      subtitle: 'Tages-XP',
      date: row.entry_date as string,
      xp: row.xp_amount as number,
      memberKind: 'child',
      memberId: row.child_id as string,
    })
  }

  entries.sort((a, b) => b.date.localeCompare(a.date))
  return { entries: entries.slice(0, limit), error: null }
}

export async function fetchCompletionsForChildOnDate(
  childId: string,
  entryDate: string,
): Promise<{ questIds: string[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('quest_completions')
    .select('quest_id')
    .eq('child_id', childId)
    .eq('completed_on', entryDate)
    .not('creator_confirmed_at', 'is', null)

  if (error) return { questIds: [], error: new Error(error.message) }
  return { questIds: (data ?? []).map((row) => row.quest_id as string), error: null }
}

/** Mindestens eine Quest wurde abgehakt (Assignee oder Creator). */
export async function familyHasQuestCompletionActivity(
  familyId: string,
): Promise<{ hasActivity: boolean; error: Error | null }> {
  const { count, error } = await supabase
    .from('quest_completions')
    .select('id', { count: 'exact', head: true })
    .eq('family_id', familyId)
    .not('assignee_confirmed_at', 'is', null)

  if (error) return { hasActivity: false, error: new Error(error.message) }
  return { hasActivity: (count ?? 0) > 0, error: null }
}

async function deleteQuestXpEntryForCompletion(input: {
  familyId: string
  completionId: string
  questId: string
  childId: string
  entryDate: string
}): Promise<{ error: Error | null }> {
  const { data: byMetadata, error: metaFetchError } = await supabase
    .from('daily_xp_entries')
    .select('id')
    .eq('family_id', input.familyId)
    .eq('child_id', input.childId)
    .filter('metadata->>quest_completion_id', 'eq', input.completionId)

  if (metaFetchError) return { error: new Error(metaFetchError.message) }

  const ids = (byMetadata ?? []).map((row) => row.id as string)
  if (ids.length === 0) {
    const { data: bySource, error: sourceFetchError } = await supabase
      .from('daily_xp_entries')
      .select('id')
      .eq('family_id', input.familyId)
      .eq('child_id', input.childId)
      .eq('entry_date', input.entryDate)
      .eq('source', 'quest')
      .eq('source_id', input.questId)

    if (sourceFetchError) return { error: new Error(sourceFetchError.message) }
    ids.push(...(bySource ?? []).map((row) => row.id as string))
  }

  if (ids.length === 0) return { error: null }

  const { error: deleteError } = await supabase.from('daily_xp_entries').delete().in('id', ids)
  if (deleteError) return { error: new Error(deleteError.message) }
  return { error: null }
}

/** Admin: Quest-Abschluss entfernen — bei bestätigten Quests werden XP zurückgenommen. */
export async function adminDeleteQuestCompletion(completionId: string): Promise<{ error: Error | null }> {
  const { data: row, error: fetchError } = await supabase
    .from('quest_completions')
    .select(
      'id, quest_id, child_id, parent_id, family_id, completed_on, assignee_confirmed_at, creator_confirmed_at, xp_awarded',
    )
    .eq('id', completionId)
    .maybeSingle()

  if (fetchError) return { error: new Error(fetchError.message) }
  if (!row) return { error: new Error('Quest-Abschluss nicht gefunden.') }

  const familyId = row.family_id as string
  const adminError = await assertFamilyAdminSession(familyId)
  if (adminError.error) return adminError

  if (!row.assignee_confirmed_at) {
    return { error: new Error('Diese Quest wurde noch nicht als erledigt gemeldet.') }
  }

  const entryDate = normalizeDateKey(row.completed_on as string)
  const childId = row.child_id as string | null
  const questId = row.quest_id as string

  if (row.creator_confirmed_at && childId) {
    const xpError = await deleteQuestXpEntryForCompletion({
      familyId,
      completionId,
      questId,
      childId,
      entryDate,
    })
    if (xpError.error) return xpError
  }

  const { error: deleteError } = await supabase.from('quest_completions').delete().eq('id', completionId)
  if (deleteError) return { error: new Error(deleteError.message) }

  await resyncFamilyXpHistoryForDate(familyId, entryDate)
  return { error: null }
}
