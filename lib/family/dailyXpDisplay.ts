/** Tages-XP pro Familienmitglied — gleiche Logik wie Life-XP Bewegung/Ernährung, Skala fix bis 30. */
export const MEMBER_DAILY_XP_MAX = 30
export const MEMBER_DAILY_XP_TARGET = 15
export const MEMBER_DAILY_XP_BOOST_THRESHOLD = 20

/** Familie gemeinsam: Happy_all-Banner ab dieser Tages-XP-Summe. */
export const FAMILY_DAILY_XP_HAPPY_ALL_MIN = 60

export const HAPPY_ALL_PORTRAIT_SRC = '/avatars/Happy_all.webp'

export function clampMemberDailyXp(value: number): number {
  return Math.min(MEMBER_DAILY_XP_MAX, Math.max(0, Math.floor(value)))
}

export function sumFamilyTodayXp(
  parents: ReadonlyArray<{ todayXp?: number }>,
  children: ReadonlyArray<{ todayXp?: number }>,
): number {
  let total = 0
  for (const parent of parents) {
    const xp = parent.todayXp ?? 0
    if (Number.isFinite(xp)) total += Math.max(0, Math.floor(xp))
  }
  for (const child of children) {
    const xp = child.todayXp ?? 0
    if (Number.isFinite(xp)) total += Math.max(0, Math.floor(xp))
  }
  return total
}

export function familyReachedHappyAllToday(
  parents: ReadonlyArray<{ todayXp?: number }>,
  children: ReadonlyArray<{ todayXp?: number }>,
): boolean {
  return sumFamilyTodayXp(parents, children) >= FAMILY_DAILY_XP_HAPPY_ALL_MIN
}

export function memberDailyXpBarPercent(value: number, scaleMax = MEMBER_DAILY_XP_MAX): number {
  if (scaleMax <= 0) return 0
  return (clampMemberDailyXp(value) / scaleMax) * 100
}

export function memberDailyXpShowBoostZone(value: number): boolean {
  return clampMemberDailyXp(value) >= MEMBER_DAILY_XP_BOOST_THRESHOLD
}
