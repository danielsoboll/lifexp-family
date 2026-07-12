-- Alle LifeXP-Family-Daten löschen (frischer Live-Start)
-- Im Supabase SQL Editor ausführen — benötigt postgres/service_role.

TRUNCATE TABLE
  public.quest_completion_creator_reactions,
  public.quest_completion_assignee_photos,
  public.quest_assignments,
  public.reward_redemptions,
  public.member_personal_goal_tracking,
  public.member_personal_goals,
  public.family_personal_goal_tracking,
  public.family_personal_goals,
  public.member_xp_goal_daily_progress,
  public.member_xp_goal_periods,
  public.family_xp_goal_periods,
  public.member_daily_xp_history,
  public.family_daily_xp_history,
  public.family_challenge_progress,
  public.quest_completions,
  public.daily_xp_entries,
  public.recurring_quest_template_assignments,
  public.recurring_quest_templates,
  public.family_challenges,
  public.rewards,
  public.quests,
  public.child_profiles,
  public.family_members,
  public.families,
  public.parent_profiles
RESTART IDENTITY CASCADE;
