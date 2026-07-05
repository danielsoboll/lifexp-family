import { cetAddDays, cetToday, normalizeDateKey } from '../cetDate'
import { readFamilySession, type FamilySession } from '../familySession'
import { supabase } from '../supabase'
import { assertFamilyAdminSession } from './admin'
import { isFamilyPlus } from './familyPlus'
import { fetchFamilyById } from './families'
import { replaceQuestAssignments } from './questAssignments'
import { clampQuestXp } from './questRules'
import { recurringScheduleMatchesDate } from './recurringQuestSchedule'
import type { QuestAssignee, RecurringQuestTemplate } from './types'

type TemplateRow = {
  id: string
  family_id: string
  title: string
  description: string
  xp_reward: number
  category: string
  schedule: RecurringQuestTemplate['schedule']
  weekly_weekday: number | null
  anchor_date: string
  ends_on: string | null
  is_active: boolean
  created_by: string | null
  created_by_child_id: string | null
  created_at: string
  updated_at: string
}

type AssignmentRow = {
  template_id: string
  assignee_type: 'parent' | 'child'
  assignee_id: string
}

export function isRecurringQuestTemplatesTableMissingError(error: {
  message?: string
  code?: string
}): boolean {
  return Boolean(
    error.message?.includes('recurring_quest_templates') ||
      error.message?.includes('recurring_template_id') ||
      error.message?.includes('schema cache') ||
      error.code === 'PGRST205',
  )
}

export async function recurringQuestTemplatesTableReady(): Promise<{ ready: boolean; error: Error | null }> {
  const { error } = await supabase.from('recurring_quest_templates').select('id').limit(0)
  if (!error) return { ready: true, error: null }
  if (isRecurringQuestTemplatesTableMissingError(error)) {
    return {
      ready: false,
      error: new Error(
        'Wiederkehrende Quests benötigen die SQL-Migration — supabase/recurring_quest_templates_migration.sql im Supabase SQL Editor ausführen.',
      ),
    }
  }
  return { ready: false, error: new Error(error.message) }
}

async function fetchAssignmentsForTemplates(
  templateIds: string[],
): Promise<Map<string, QuestAssignee[]>> {
  const map = new Map<string, QuestAssignee[]>()
  if (templateIds.length === 0) return map

  const { data, error } = await supabase
    .from('recurring_quest_template_assignments')
    .select('template_id, assignee_type, assignee_id')
    .in('template_id', templateIds)

  if (error) return map

  for (const row of (data ?? []) as AssignmentRow[]) {
    const list = map.get(row.template_id) ?? []
    list.push({ type: row.assignee_type, id: row.assignee_id })
    map.set(row.template_id, list)
  }
  return map
}

function mapTemplate(row: TemplateRow, assignees: QuestAssignee[]): RecurringQuestTemplate {
  return {
    id: row.id,
    family_id: row.family_id,
    title: row.title,
    description: row.description,
    xp_reward: row.xp_reward,
    category: row.category,
    schedule: row.schedule,
    weekly_weekday: row.weekly_weekday,
    anchor_date: normalizeDateKey(row.anchor_date),
    ends_on: row.ends_on ? normalizeDateKey(row.ends_on) : null,
    is_active: row.is_active,
    created_by: row.created_by,
    created_by_child_id: row.created_by_child_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    assignees,
  }
}

export async function fetchRecurringQuestTemplates(
  familyId: string,
  options: { activeOnly?: boolean } = {},
): Promise<{ templates: RecurringQuestTemplate[]; error: Error | null }> {
  let query = supabase.from('recurring_quest_templates').select('*').eq('family_id', familyId)
  if (options.activeOnly) query = query.eq('is_active', true)
  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    if (isRecurringQuestTemplatesTableMissingError(error)) {
      return { templates: [], error: null }
    }
    return { templates: [], error: new Error(error.message) }
  }

  const rows = (data ?? []) as TemplateRow[]
  const assignments = await fetchAssignmentsForTemplates(rows.map((row) => row.id))
  return {
    templates: rows.map((row) => mapTemplate(row, assignments.get(row.id) ?? [])),
    error: null,
  }
}

async function replaceTemplateAssignments(
  templateId: string,
  assignees: QuestAssignee[],
): Promise<{ error: Error | null }> {
  const { error: deleteError } = await supabase
    .from('recurring_quest_template_assignments')
    .delete()
    .eq('template_id', templateId)
  if (deleteError) return { error: new Error(deleteError.message) }

  if (assignees.length === 0) return { error: null }

  const { error } = await supabase.from('recurring_quest_template_assignments').insert(
    assignees.map((assignee) => ({
      template_id: templateId,
      assignee_type: assignee.type,
      assignee_id: assignee.id,
    })),
  )
  if (error) return { error: new Error(error.message) }
  return { error: null }
}

function validateCreatorNotAssignee(assignees: QuestAssignee[]): Error | null {
  const session = readFamilySession()
  if (!session) return new Error('Bitte zuerst anmelden.')
  if (assignees.length === 1) {
    const assignee = assignees[0]!
    if (session.memberKind === assignee.type && session.memberId === assignee.id) {
      return new Error('Du kannst dir keine Quest eintragen — nur für andere Familienmitglieder.')
    }
  }
  return null
}

export function sessionIsRecurringTemplateCreator(
  template: Pick<RecurringQuestTemplate, 'created_by' | 'created_by_child_id'>,
  session: FamilySession,
): boolean {
  if (session.memberKind === 'parent') return template.created_by === session.memberId
  return template.created_by_child_id === session.memberId
}

async function fetchTemplateRow(
  templateId: string,
  familyId: string,
): Promise<{ template: RecurringQuestTemplate | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('recurring_quest_templates')
    .select('*')
    .eq('id', templateId)
    .eq('family_id', familyId)
    .maybeSingle()

  if (error) {
    if (isRecurringQuestTemplatesTableMissingError(error)) {
      return { template: null, error: new Error('Wiederkehrende Quests sind noch nicht eingerichtet.') }
    }
    return { template: null, error: new Error(error.message) }
  }
  if (!data) return { template: null, error: new Error('Vorlage nicht gefunden.') }

  const row = data as TemplateRow
  const assignments = await fetchAssignmentsForTemplates([row.id])
  return { template: mapTemplate(row, assignments.get(row.id) ?? []), error: null }
}

async function assertRecurringTemplateEditor(
  templateId: string,
  familyId: string,
): Promise<{ template: RecurringQuestTemplate | null; error: Error | null }> {
  const adminError = await assertFamilyAdminSession(familyId)
  if (adminError.error) return { template: null, error: adminError.error }

  const { template, error } = await fetchTemplateRow(templateId, familyId)
  if (error || !template) return { template: null, error: error ?? new Error('Vorlage nicht gefunden.') }

  return { template, error: null }
}

export type CreateRecurringQuestTemplateInput = {
  familyId: string
  title: string
  description?: string
  xpReward: number
  schedule: RecurringQuestTemplate['schedule']
  weeklyWeekday?: number | null
  assignees: QuestAssignee[]
}

export async function createRecurringQuestTemplate(
  input: CreateRecurringQuestTemplateInput,
): Promise<{ template: RecurringQuestTemplate | null; error: Error | null }> {
  const { family, error: familyError } = await fetchFamilyById(input.familyId)
  if (familyError) return { template: null, error: familyError }
  if (!isFamilyPlus(family)) {
    return { template: null, error: new Error('Wiederkehrende Quests sind ein PLUS-Feature.') }
  }

  const tableCheck = await recurringQuestTemplatesTableReady()
  if (!tableCheck.ready) return { template: null, error: tableCheck.error }

  if (input.assignees.length === 0) {
    return { template: null, error: new Error('Bitte mindestens ein Familienmitglied auswählen.') }
  }

  const selfError = validateCreatorNotAssignee(input.assignees)
  if (selfError) return { template: null, error: selfError }

  if (input.schedule === 'weekly' && (input.weeklyWeekday === null || input.weeklyWeekday === undefined)) {
    return { template: null, error: new Error('Bitte einen Wochentag wählen.') }
  }

  const session = readFamilySession()
  if (!session) return { template: null, error: new Error('Bitte zuerst anmelden.') }

  const xpReward = clampQuestXp(input.xpReward)
  const anchorDate = cetToday()
  const familyWide = input.assignees.length > 1
  const category = familyWide ? 'familie' : 'allgemein'

  const { data, error } = await supabase
    .from('recurring_quest_templates')
    .insert({
      family_id: input.familyId,
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      xp_reward: xpReward,
      category,
      schedule: input.schedule,
      weekly_weekday: input.schedule === 'weekly' ? input.weeklyWeekday : null,
      anchor_date: anchorDate,
      created_by: session.memberKind === 'parent' ? session.memberId : null,
      created_by_child_id: session.memberKind === 'child' ? session.memberId : null,
    })
    .select('*')
    .single()

  if (error) return { template: null, error: new Error(error.message) }

  const row = data as TemplateRow
  const { error: assignError } = await replaceTemplateAssignments(row.id, input.assignees)
  if (assignError) {
    await supabase.from('recurring_quest_templates').delete().eq('id', row.id)
    return { template: null, error: assignError }
  }

  const template = mapTemplate(row, input.assignees)
  const { generated, error: ensureError } = await ensureRecurringQuestInstances(input.familyId, [template])
  if (ensureError) return { template, error: ensureError }

  void generated
  return { template, error: null }
}

export async function fetchRecurringQuestTemplateById(
  templateId: string,
  familyId: string,
): Promise<{ template: RecurringQuestTemplate | null; error: Error | null }> {
  return fetchTemplateRow(templateId, familyId)
}

export type UpdateRecurringQuestTemplateInput = {
  templateId: string
  familyId: string
  title: string
  description?: string
  xpReward: number
  schedule: RecurringQuestTemplate['schedule']
  weeklyWeekday?: number | null
  assignees: QuestAssignee[]
}

export async function updateRecurringQuestTemplate(
  input: UpdateRecurringQuestTemplateInput,
): Promise<{ error: Error | null }> {
  const { template, error: assertError } = await assertRecurringTemplateEditor(input.templateId, input.familyId)
  if (assertError || !template) return { error: assertError ?? new Error('Vorlage nicht gefunden.') }

  const { family, error: familyError } = await fetchFamilyById(input.familyId)
  if (familyError) return { error: familyError }
  if (!isFamilyPlus(family)) {
    return { error: new Error('Wiederkehrende Quests sind ein PLUS-Feature.') }
  }

  if (input.assignees.length === 0) {
    return { error: new Error('Bitte mindestens ein Familienmitglied auswählen.') }
  }

  const selfError = validateCreatorNotAssignee(input.assignees)
  if (selfError) return { error: selfError }

  if (input.schedule === 'weekly' && (input.weeklyWeekday === null || input.weeklyWeekday === undefined)) {
    return { error: new Error('Bitte einen Wochentag wählen.') }
  }

  const xpReward = clampQuestXp(input.xpReward)
  const familyWide = input.assignees.length > 1
  const category = familyWide ? 'familie' : 'allgemein'

  const { error: updateError } = await supabase
    .from('recurring_quest_templates')
    .update({
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      xp_reward: xpReward,
      category,
      schedule: input.schedule,
      weekly_weekday: input.schedule === 'weekly' ? input.weeklyWeekday : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.templateId)
    .eq('family_id', input.familyId)

  if (updateError) return { error: new Error(updateError.message) }

  const { error: assignError } = await replaceTemplateAssignments(input.templateId, input.assignees)
  if (assignError) return { error: assignError }

  await syncOpenRecurringQuestInstances({
    templateId: input.templateId,
    familyId: input.familyId,
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    xpReward,
    category,
    assignees: input.assignees,
  })

  if (template.is_active) {
    const updatedTemplate: RecurringQuestTemplate = {
      ...template,
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      xp_reward: xpReward,
      category,
      schedule: input.schedule,
      weekly_weekday: input.schedule === 'weekly' ? (input.weeklyWeekday ?? null) : null,
      assignees: input.assignees,
    }
    await ensureRecurringQuestInstances(input.familyId, [updatedTemplate])
  }

  return { error: null }
}

async function syncOpenRecurringQuestInstances(input: {
  templateId: string
  familyId: string
  title: string
  description: string
  xpReward: number
  category: string
  assignees: QuestAssignee[]
}): Promise<void> {
  const today = cetToday()
  const tomorrow = cetAddDays(today, 1)

  const { data: quests, error } = await supabase
    .from('quests')
    .select('id, task_date')
    .eq('family_id', input.familyId)
    .eq('recurring_template_id', input.templateId)
    .eq('is_active', true)
    .in('task_date', [today, tomorrow])

  if (error || !quests?.length) return

  for (const quest of quests) {
    const questId = quest.id as string
    const taskDate = normalizeDateKey(quest.task_date as string)

    const { data: completions } = await supabase
      .from('quest_completions')
      .select('assignee_confirmed_at')
      .eq('quest_id', questId)
      .eq('completed_on', taskDate)

    if ((completions ?? []).some((row) => row.assignee_confirmed_at)) continue

    await supabase
      .from('quests')
      .update({
        title: input.title,
        description: input.description,
        xp_reward: input.xpReward,
        category: input.category,
        updated_at: new Date().toISOString(),
      })
      .eq('id', questId)

    await replaceQuestAssignments(questId, input.assignees)
  }
}

async function removeOpenRecurringQuestInstances(templateId: string, familyId: string): Promise<void> {
  const today = cetToday()
  const tomorrow = cetAddDays(today, 1)

  const { data: quests, error } = await supabase
    .from('quests')
    .select('id, task_date')
    .eq('family_id', familyId)
    .eq('recurring_template_id', templateId)
    .eq('is_active', true)
    .in('task_date', [today, tomorrow])

  if (error || !quests?.length) return

  for (const quest of quests) {
    const questId = quest.id as string
    const taskDate = normalizeDateKey(quest.task_date as string)
    const { data: completions } = await supabase
      .from('quest_completions')
      .select('assignee_confirmed_at')
      .eq('quest_id', questId)
      .eq('completed_on', taskDate)

    if ((completions ?? []).some((row) => row.assignee_confirmed_at)) continue

    await supabase
      .from('quests')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', questId)
  }
}

/** Vorlage ausplanen (z. B. Urlaub) — bleibt gespeichert, erzeugt keine neuen Tage. */
export async function pauseRecurringQuestTemplate(
  templateId: string,
  familyId: string,
): Promise<{ error: Error | null }> {
  const { error: assertError } = await assertRecurringTemplateEditor(templateId, familyId)
  if (assertError) return { error: assertError }

  const { error } = await supabase
    .from('recurring_quest_templates')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .eq('family_id', familyId)

  if (error) return { error: new Error(error.message) }

  await removeOpenRecurringQuestInstances(templateId, familyId)
  return { error: null }
}

/** Ausgeplante Vorlage wieder aktivieren. */
export async function reactivateRecurringQuestTemplate(
  templateId: string,
  familyId: string,
): Promise<{ error: Error | null }> {
  const { template, error: assertError } = await assertRecurringTemplateEditor(templateId, familyId)
  if (assertError || !template) return { error: assertError ?? new Error('Vorlage nicht gefunden.') }

  const { error } = await supabase
    .from('recurring_quest_templates')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .eq('family_id', familyId)

  if (error) return { error: new Error(error.message) }

  await ensureRecurringQuestInstances(familyId)
  return { error: null }
}

/** @deprecated — nutze pauseRecurringQuestTemplate */
export async function deactivateRecurringQuestTemplate(
  templateId: string,
  familyId: string,
): Promise<{ error: Error | null }> {
  return pauseRecurringQuestTemplate(templateId, familyId)
}

async function questInstanceExists(templateId: string, taskDate: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('quests')
    .select('id')
    .eq('recurring_template_id', templateId)
    .eq('task_date', taskDate)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    if (isRecurringQuestTemplatesTableMissingError(error)) return true
    return true
  }
  return Boolean(data)
}

async function generateQuestFromTemplate(
  template: RecurringQuestTemplate,
  taskDate: string,
): Promise<{ created: boolean; error: Error | null }> {
  if (template.assignees.length === 0) return { created: false, error: null }

  if (await questInstanceExists(template.id, taskDate)) {
    return { created: false, error: null }
  }

  const { data, error } = await supabase
    .from('quests')
    .insert({
      family_id: template.family_id,
      child_id: null,
      title: template.title,
      description: template.description,
      xp_reward: template.xp_reward,
      category: template.category,
      recurrence: 'once',
      task_date: taskDate,
      recurring_template_id: template.id,
      created_by: template.created_by,
      created_by_child_id: template.created_by_child_id,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { created: false, error: null }
    return { created: false, error: new Error(error.message) }
  }

  if (!data?.id) return { created: false, error: null }

  const { error: assignError } = await replaceQuestAssignments(data.id as string, template.assignees)
  if (assignError) {
    await supabase.from('quests').update({ is_active: false }).eq('id', data.id)
    return { created: false, error: assignError }
  }

  return { created: true, error: null }
}

/** Erzeugt fehlende Tages-Quests für heute und morgen (beim App-Start). */
export async function ensureRecurringQuestInstances(
  familyId: string,
  prefetchedTemplates?: RecurringQuestTemplate[],
): Promise<{ generated: number; error: Error | null }> {
  const { family, error: familyError } = await fetchFamilyById(familyId)
  if (familyError) return { generated: 0, error: familyError }
  if (!isFamilyPlus(family)) return { generated: 0, error: null }

  const tableCheck = await recurringQuestTemplatesTableReady()
  if (!tableCheck.ready) return { generated: 0, error: null }

  let templates = prefetchedTemplates
  if (!templates) {
    const { templates: rows, error } = await fetchRecurringQuestTemplates(familyId, { activeOnly: true })
    if (error) return { generated: 0, error }
    templates = rows
  }

  const today = cetToday()
  const tomorrow = cetAddDays(today, 1)
  const dates = [today, tomorrow]
  let generated = 0

  for (const template of templates) {
    if (!template.is_active || template.assignees.length === 0) continue

    for (const taskDate of dates) {
      if (
        !recurringScheduleMatchesDate({
          schedule: template.schedule,
          anchorDate: template.anchor_date,
          taskDate,
          weeklyWeekday: template.weekly_weekday,
          endsOn: template.ends_on,
        })
      ) {
        continue
      }

      const { created, error: genError } = await generateQuestFromTemplate(template, taskDate)
      if (genError) return { generated, error: genError }
      if (created) generated += 1
    }
  }

  return { generated, error: null }
}
