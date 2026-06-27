/** Tages-XP pro Familienmitglied — gleiche Logik wie Life-XP Bewegung/Ernährung, Skala fix bis 30. */
export const MEMBER_DAILY_XP_MAX = 30
export const MEMBER_DAILY_XP_TARGET = 20
export const MEMBER_DAILY_XP_BOOST_THRESHOLD = 20

/** Familie gemeinsam: Happy_all-Banner ab dieser Tages-XP-Summe. */
export const FAMILY_DAILY_XP_HAPPY_ALL_MIN = 60

/** Verlauf-Familienchart: Y-Achse bis Mitglieder × max. Tages-XP (je 30). */
export function familyDailyXpChartMax(memberCount: number): number {
  return Math.max(0, memberCount) * MEMBER_DAILY_XP_MAX
}

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

/** Zwei Stufen (_1, _2): Stufe _2 ab 20 XP — z. B. Opa_1, Opa_2. */
export const MEMBER_PORTRAIT_TWO_TIER_MINS = [20] as const

/** Stämme mit nur _1 … _3 (z. B. Frau_2): _2 ab 10 XP, _3 ab 21 XP. */
export const MEMBER_PORTRAIT_THREE_TIER_MINS = [10, 21] as const

/** Vier Stufen (_1 … _4): letzte Stufe ebenfalls erst ab 21 XP. */
export const MEMBER_PORTRAIT_FOUR_TIER_MINS = [5, 10, 21] as const

/** Fünf Stufen (_1 … _5). */
export const MEMBER_PORTRAIT_FIVE_TIER_MINS = [5, 10, 15, 21] as const

export type MemberPortraitXpTier = 1 | 2 | 3 | 4 | 5 | 6

/** XP-Schwellen für Stufe _2 … _N — abhängig von verfügbaren Portrait-Stufen. */
export function memberPortraitTierMinsForMaxTier(maxTier: number): readonly number[] {
  const cappedMax = Math.min(6, Math.max(1, Math.floor(maxTier)))
  if (cappedMax === 2) return MEMBER_PORTRAIT_TWO_TIER_MINS
  if (cappedMax <= 3) return MEMBER_PORTRAIT_THREE_TIER_MINS
  if (cappedMax === 4) return MEMBER_PORTRAIT_FOUR_TIER_MINS
  if (cappedMax === 5) return MEMBER_PORTRAIT_FIVE_TIER_MINS
  return MEMBER_PORTRAIT_XP_TIER_MINS
}

export function memberPortraitTierFromDailyXp(
  todayXp: number,
  maxTier: number = 6,
): MemberPortraitXpTier {
  const xp = clampMemberDailyXp(todayXp)
  const cappedMax = Math.min(6, Math.max(1, Math.floor(maxTier)))
  const tierMins = memberPortraitTierMinsForMaxTier(cappedMax)

  let tier: MemberPortraitXpTier = 1
  for (let i = 0; i < tierMins.length; i++) {
    const nextTier = (i + 2) as MemberPortraitXpTier
    if (nextTier > cappedMax) break
    if (xp >= tierMins[i]) tier = nextTier
  }
  return tier
}

/** Nächster Zehner über der aktuellen Familien-Tages-XP-Summe (z. B. 31 → 40, 55 → 60). */
export function familyNextXpMilestone(familyTodayXp: number): number {
  const xp = Math.max(0, Math.floor(familyTodayXp))
  if (xp === 0) return 10
  return Math.ceil((xp + 1) / 10) * 10
}
