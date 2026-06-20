import { cetAddDays, cetToday, normalizeDateKey } from '../cetDate'
import { MEMBER_DAILY_XP_MAX } from './dailyXpDisplay'

/** Pro Quest mindestens / höchstens so viele XP (Life-XP-Parität). */
export const QUEST_XP_MIN = 1
export const QUEST_XP_MAX = 10

/** Ab diesem Wert Bestätigung: „Ist dir das wirklich so wichtig?“ */
export const QUEST_XP_HIGH_CONFIRM_THRESHOLD = 5

export type QuestDayChoice = 'today' | 'tomorrow'

export function questDayChoiceToDateKey(choice: QuestDayChoice, instant = Date.now()): string {
  const today = cetToday(instant)
  return choice === 'tomorrow' ? cetAddDays(today, 1) : today
}

export function isAllowedQuestTaskDate(taskDate: string, instant = Date.now()): boolean {
  const key = normalizeDateKey(taskDate)
  if (!key) return false
  const today = cetToday(instant)
  const tomorrow = cetAddDays(today, 1)
  return key === today || key === tomorrow
}

export function clampQuestXp(value: number): number {
  return Math.min(QUEST_XP_MAX, Math.max(QUEST_XP_MIN, Math.floor(value)))
}

export function questXpNeedsHighConfirm(xp: number): boolean {
  return clampQuestXp(xp) >= QUEST_XP_HIGH_CONFIRM_THRESHOLD
}

export function formatQuestDayLabel(taskDate: string, instant = Date.now()): 'Heute' | 'Morgen' | string {
  const key = normalizeDateKey(taskDate)
  const today = cetToday(instant)
  if (key === today) return 'Heute'
  if (key === cetAddDays(today, 1)) return 'Morgen'
  return key
}

export function taskDateToQuestDayChoice(taskDate: string, instant = Date.now()): QuestDayChoice {
  const key = normalizeDateKey(taskDate)
  const today = cetToday(instant)
  return key === cetAddDays(today, 1) ? 'tomorrow' : 'today'
}

export function memberDailyXpRemaining(scheduledXp: number, earnedXp: number): number {
  const used = Math.max(0, Math.floor(scheduledXp)) + Math.max(0, Math.floor(earnedXp))
  return Math.max(0, MEMBER_DAILY_XP_MAX - used)
}

export function canAddQuestXp(scheduledXp: number, earnedXp: number, newXp: number): boolean {
  return memberDailyXpRemaining(scheduledXp, earnedXp) >= clampQuestXp(newXp)
}
