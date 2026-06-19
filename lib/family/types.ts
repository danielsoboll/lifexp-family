export type FamilyMemberRole = 'owner' | 'parent'
export type QuestRecurrence = 'once' | 'daily' | 'weekly'
export type XpEntrySource = 'quest' | 'bonus' | 'challenge' | 'manual' | 'redemption_adjustment'

export type Family = {
  id: string
  name: string
  invite_code: string | null
  timezone: string
  created_at: string
  updated_at: string
}

export type ParentProfile = {
  id: string
  display_name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type FamilyMember = {
  id: string
  family_id: string
  user_id: string
  role: FamilyMemberRole
  joined_at: string
  created_at: string
}

export type ChildProfile = {
  id: string
  family_id: string
  display_name: string
  birth_year: number | null
  avatar_key: string
  total_xp: number
  level: number
  is_active: boolean
  sort_order: number
  notes: string | null
  created_at: string
  updated_at: string
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
  is_active: boolean
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type QuestCompletion = {
  id: string
  quest_id: string
  child_id: string
  family_id: string
  completed_on: string
  xp_awarded: number
  completed_at: string
  completed_by: string | null
  note: string | null
}

export type DailyXpEntry = {
  id: string
  family_id: string
  child_id: string
  entry_date: string
  source: XpEntrySource
  source_id: string | null
  xp_amount: number
  metadata: Record<string, unknown>
  created_at: string
}

export type ChildWithTodayXp = ChildProfile & {
  todayXp: number
}

export type QuestWithCompletion = Quest & {
  completedToday: boolean
  completionChildIds: string[]
}
