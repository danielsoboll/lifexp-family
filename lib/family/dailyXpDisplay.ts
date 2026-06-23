/** Tages-XP pro Familienmitglied — gleiche Logik wie Life-XP Bewegung/Ernährung, Skala fix bis 30. */
export const MEMBER_DAILY_XP_MAX = 30
export const MEMBER_DAILY_XP_TARGET = 20
export const MEMBER_DAILY_XP_BOOST_THRESHOLD = 20

/** Familie gemeinsam: Happy_all-Banner ab dieser Tages-XP-Summe. */
export const FAMILY_DAILY_XP_HAPPY_ALL_MIN = 60

/** Nächste Familien-Stufe (Happy_all_2-Zyklus o. ä.) ab dieser Tages-XP-Summe. */
export const FAMILY_DAILY_XP_NEXT_TIER_MIN = 80

export const HAPPY_ALL_PORTRAIT_SRC = '/avatars/Happy_all.webp'
export const HAPPY_ALL_2_PORTRAIT_SRC = '/avatars/Happy_all_2.webp'

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

/** Ab diesen Tages-XP: Portrait-Stufe _2 … _6 (Basis bleibt _1). */
export const MEMBER_PORTRAIT_XP_TIER_MINS = [5, 10, 15, 20, 25] as const

export type MemberPortraitXpTier = 1 | 2 | 3 | 4 | 5 | 6

export function memberPortraitTierFromDailyXp(todayXp: number): MemberPortraitXpTier {
  const xp = clampMemberDailyXp(todayXp)
  let tier: MemberPortraitXpTier = 1
  for (let i = 0; i < MEMBER_PORTRAIT_XP_TIER_MINS.length; i++) {
    if (xp >= MEMBER_PORTRAIT_XP_TIER_MINS[i]) {
      tier = (i + 2) as MemberPortraitXpTier
    }
  }
  return tier
}
