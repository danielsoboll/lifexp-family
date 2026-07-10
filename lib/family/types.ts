import type { ChildGender, ParentGender } from './memberGender'

export type FamilyMemberRole = 'owner' | 'parent' | 'child'
export type QuestRecurrence = 'once' | 'daily' | 'weekly'

export type RecurringQuestSchedule = 'daily' | 'weekdays' | 'every_other_day' | 'weekly'
export type XpEntrySource = 'quest' | 'bonus' | 'challenge' | 'manual' | 'redemption_adjustment' | 'streak'

export type FamilyPlan = 'free' | 'plus'

export type FamilySubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'
  | string

export type Family = {
  id: string
  name: string
  invite_code: string | null
  timezone: string
  accent_key: string
  plan: FamilyPlan
  subscription_status: FamilySubscriptionStatus | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plus_until: string | null
  trial_ends_at: string | null
  cancel_at_period_end: boolean
  guide_welcome_seen: boolean
  guide_quest_seen: boolean
  guide_invite_seen: boolean
  guide_profile_seen: boolean
  guide_finished: boolean
  guide_solo_quest_seen: boolean
  created_at: string
  updated_at: string
}

export type ParentProfile = {
  id: string
  display_name: string
  gender: ParentGender
  can_admin: boolean
  avatar_url: string | null
  accent_key: string
  rec_code: string | null
  rec_code_ok: boolean
  app_installed: boolean
  app_later: boolean
  streak_intro_seen: boolean
  created_at: string
  updated_at: string
}

export type FamilyMember = {
  id: string
  family_id: string
  parent_id: string
  role: FamilyMemberRole
  joined_at: string
  created_at: string
}

export type ChildProfile = {
  id: string
  family_id: string
  display_name: string
  gender: ChildGender
  age: number | null
  can_admin: boolean
  /** Portrait-Datei-Stamm, z. B. Junge_1_1 (Spalte avatar_key) */
  portrait_id: string | null
  total_xp: number
  level: number
  is_active: boolean
  sort_order: number
  notes: string | null
  accent_key: string
  rec_code: string | null
  rec_code_ok: boolean
  app_installed: boolean
  app_later: boolean
  streak_intro_seen: boolean
  no_own_device: boolean
  created_at: string
  updated_at: string
}

export type QuestAssignee = {
  type: 'parent' | 'child'
  id: string
}

export type RecurringQuestTemplate = {
  id: string
  family_id: string
  title: string
  description: string
  xp_reward: number
  category: string
  schedule: RecurringQuestSchedule
  weekly_weekday: number | null
  anchor_date: string
  ends_on: string | null
  is_active: boolean
  created_by: string | null
  created_by_child_id: string | null
  created_at: string
  updated_at: string
  assignees: QuestAssignee[]
}

export type Quest = {
  id: string
  family_id: string
  child_id: string | null
  title: string
  description: string
  xp_reward: number
  category: string
  recurrence: QuestRecurrence
  task_date: string
  completion_deadline?: string
  is_active: boolean
  sort_order: number
  created_by: string | null
  created_by_child_id: string | null
  recurring_template_id?: string | null
  created_at: string
  updated_at: string
}

export type QuestCompletion = {
  id: string
  quest_id: string
  child_id: string | null
  parent_id: string | null
  family_id: string
  completed_on: string
  xp_awarded: number
  completed_at: string
  completed_by: string | null
  note: string | null
  assignee_confirmed_at: string | null
  creator_confirmed_at: string | null
  creator_confirmed_by_parent_id: string | null
  creator_confirmed_by_child_id: string | null
}

export type QuestFulfillmentStatus = 'open' | 'awaiting_creator' | 'done'

export type QuestAssigneeCompletion = {
  completionId: string
  assigneeConfirmedAt: string | null
  creatorConfirmedAt: string | null
}

export type QuestCompletionOnDate = {
  id: string
  childId: string | null
  parentId: string | null
  assigneeConfirmedAt: string | null
  creatorConfirmedAt: string | null
}

export type ChildWithTodayXp = ChildProfile & {
  todayXp: number
}

export type QuestWithCompletion = Quest & {
  assignees: QuestAssignee[]
  /** @deprecated Nutze fulfillmentStatus / assigneeCompletion */
  completedToday: boolean
  /** Nur vollständig bestätigt (Stufe 2) */
  completionChildIds: string[]
  completionParentIds: string[]
  assigneeCompletion: QuestAssigneeCompletion | null
  fulfillmentStatus: QuestFulfillmentStatus
  /** Abschlüsse am Quest-Tag (pro zugewiesenem Mitglied). */
  completionsOnDate: QuestCompletionOnDate[]
}

export type PendingCreatorConfirmation = {
  completionId: string
  questId: string
  questTitle: string
  xpReward: number
  taskDate: string
  assigneeName: string
  assigneeConfirmedAt: string
}

export type DailyXpEntry = {
  id: string
  family_id: string
  child_id: string | null
  parent_id?: string | null
  entry_date: string
  source: XpEntrySource
  source_id: string | null
  xp_amount: number
  metadata: Record<string, unknown>
  created_at: string
}
