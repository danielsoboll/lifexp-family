import { cetAddDays, cetToday, cetYesterday, normalizeDateKey } from '../cetDate'
import { MEMBER_DAILY_XP_MAX } from './dailyXpDisplay'

/** Pro Quest mindestens / höchstens so viele XP (Life-XP-Parität). */
export const QUEST_XP_MIN = 1
export const QUEST_XP_MAX = 10

/** Ab diesem Wert Bestätigung: „Ist dir das wirklich so wichtig?“ */
export const QUEST_XP_HIGH_CONFIRM_THRESHOLD = 5

/** Offene Quests von gestern können noch heute erledigt/bestätigt werden. */
export const QUEST_YESTERDAY_GRACE_DAYS = 1

export type QuestDayChoice = 'today' | 'tomorrow'

/** Letzter Kalendertag (Europe/Berlin), an dem die Quest noch abschließbar ist. */
export function questCompletionDeadline(taskDate: string, instant = Date.now()): string {
  const key = normalizeDateKey(taskDate)
  if (!key) return ''
  return cetAddDays(key, QUEST_YESTERDAY_GRACE_DAYS)
}

/** Abgelaufen — ab dem übernächsten Tag nicht mehr sichtbar/abschließbar. */
export function isQuestExpired(taskDate: string, instant = Date.now()): boolean {
  const key = normalizeDateKey(taskDate)
  if (!key) return true
  return questCompletionDeadline(key, instant) < cetToday(instant)
}

export function isQuestFromYesterday(taskDate: string, instant = Date.now()): boolean {
  return normalizeDateKey(taskDate) === cetYesterday(instant)
}

export function isQuestOpenFromYesterday(
  quest: { task_date: string; fulfillmentStatus: string },
  instant = Date.now(),
): boolean {
  if (quest.fulfillmentStatus === 'done') return false
  return isQuestFromYesterday(quest.task_date, instant) && !isQuestExpired(quest.task_date, instant)
}

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

export const QUEST_HIGH_XP_CONFIRM_EYEBROW = 'Viele XP'

export function questHighXpConfirmTitle(xp: number): string {
  return `+${clampQuestXp(xp)} XP — ist dir das wirklich so wichtig?`
}

export const QUEST_HIGH_XP_CONFIRM_BODY =
  'Große Belohnungen sollten besondere Aufgaben sein. Stimmt das für diese Quest?'

export const QUEST_HIGH_XP_INLINE_HINT = `Ab ${QUEST_XP_HIGH_CONFIRM_THRESHOLD} XP pro Quest fragt LifeXP vor dem Eintragen noch einmal nach.`

export function formatQuestDayLabel(taskDate: string, instant = Date.now()): 'Heute' | 'Morgen' | 'Gestern' | string {
  const key = normalizeDateKey(taskDate)
  const today = cetToday(instant)
  if (key === today) return 'Heute'
  if (key === cetYesterday(instant)) return 'Gestern'
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
