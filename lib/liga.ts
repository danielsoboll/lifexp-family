import type { AvatarGender } from './avatarLibrary'

export type LigaTierId = 'recruit' | 'fighter' | 'bronze' | 'silver' | 'gold'

export type LigaTier = {
  id: LigaTierId
  shortLabel: string
  title: string
  medal?: string
  barClass: string
  labelClass: string
}

/** Von unten nach oben — Rekrut zuerst, Elite-Kämpfer oben. */
export const LIGA_TIERS: LigaTier[] = [
  {
    id: 'recruit',
    shortLabel: 'Rekrut',
    title: 'Rekrut',
    barClass:
      'bg-gradient-to-t from-sky-300 via-sky-200 to-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:from-sky-500 dark:via-sky-400 dark:to-sky-300',
    labelClass: 'text-sky-800 dark:text-sky-50',
  },
  {
    id: 'fighter',
    shortLabel: 'Kämpfer',
    title: 'Kämpfer',
    barClass:
      'bg-gradient-to-t from-emerald-400 via-emerald-300 to-green-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] dark:from-emerald-500 dark:via-emerald-400 dark:to-green-300',
    labelClass: 'text-emerald-950 dark:text-emerald-50',
  },
  {
    id: 'bronze',
    shortLabel: 'Bronze',
    title: 'Dekorierter Kämpfer',
    medal: 'Bronze',
    barClass:
      'bg-gradient-to-t from-amber-800 via-amber-700 to-amber-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] dark:from-amber-900 dark:via-amber-800 dark:to-amber-700',
    labelClass: 'text-amber-950 dark:text-amber-100',
  },
  {
    id: 'silver',
    shortLabel: 'Silber',
    title: 'Ausgezeichneter Kämpfer',
    medal: 'Silber',
    barClass:
      'bg-gradient-to-t from-slate-500 via-slate-400 to-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:from-slate-600 dark:via-slate-500 dark:to-slate-400',
    labelClass: 'text-slate-900 dark:text-slate-100',
  },
  {
    id: 'gold',
    shortLabel: 'Gold',
    title: 'Elite-Kämpfer',
    medal: 'Gold',
    barClass:
      'bg-gradient-to-t from-yellow-600 via-amber-500 to-yellow-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:from-yellow-700 dark:via-amber-600 dark:to-yellow-500',
    labelClass: 'text-amber-950 dark:text-yellow-50',
  },
]

export const LIGA_XP_MAX = 28

export const CURRENT_LIGA_TIER_ID: LigaTierId = 'recruit'

/** Flex-Gewichte der Leiter-Segmente (muss mit LigaTower übereinstimmen). */
export const LIGA_TIER_FLEX: Record<LigaTierId, number> = {
  recruit: 1.2,
  fighter: 1,
  bronze: 1,
  silver: 1,
  gold: 1.15,
}

export function getLigaTowerFlexTotal(): number {
  return LIGA_TIERS.reduce((sum, tier) => sum + (LIGA_TIER_FLEX[tier.id] ?? 1), 0)
}

const LIGA_TIER_TITLES: Record<LigaTierId, { male: string; female: string }> = {
  recruit: { male: 'Rekrut', female: 'Rekrutin' },
  fighter: { male: 'Kämpfer', female: 'Kämpferin' },
  bronze: { male: 'Dekorierter Kämpfer', female: 'Dekorierte Kämpferin' },
  silver: { male: 'Ausgezeichneter Kämpfer', female: 'Ausgezeichnete Kämpferin' },
  gold: { male: 'Elite-Kämpfer', female: 'Elite-Kämpferin' },
}

export function clampLigaXp(xp: number): number {
  return Math.min(LIGA_XP_MAX, Math.max(0, xp))
}

/** Fortschritt zur nächsten Liga (0–1), z. B. 2/28 im aktuellen Segment. */
export function getLigaProgressFraction(xp: number, max: number = LIGA_XP_MAX): number {
  if (max <= 0) return 0
  return clampLigaXp(xp) / max
}

/** Unterkante und Höhe des aktuellen Farbsegments auf der Leiter (0–100). */
export function getLigaTierSegmentPercents(
  currentTierId: LigaTierId = CURRENT_LIGA_TIER_ID,
): { bottomPercent: number; heightPercent: number } {
  const totalFlex = getLigaTowerFlexTotal()
  if (totalFlex <= 0) return { bottomPercent: 0, heightPercent: 100 }

  let flexBelow = 0
  for (const tier of LIGA_TIERS) {
    const tierFlex = LIGA_TIER_FLEX[tier.id] ?? 1
    if (tier.id === currentTierId) {
      return {
        bottomPercent: (flexBelow / totalFlex) * 100,
        heightPercent: (tierFlex / totalFlex) * 100,
      }
    }
    flexBelow += tierFlex
  }

  return { bottomPercent: 0, heightPercent: 100 }
}

/**
 * `bottom`-Position (0–100) des goldenen Strichs von unten.
 * XP zählt nur im aktuellen Farbsegment (Rekrut = blau unten), nicht über die ganze Leiter.
 */
export function getLigaProgressLineBottomPercent(
  xp: number,
  currentTierId: LigaTierId = CURRENT_LIGA_TIER_ID,
  max: number = LIGA_XP_MAX,
): number {
  const { bottomPercent, heightPercent } = getLigaTierSegmentPercents(currentTierId)
  const progress = getLigaProgressFraction(xp, max)
  return bottomPercent + progress * heightPercent
}

/** Vertikaler Fortschrittsbalken: Start am Segment-Anfang, Höhe = XP-Fortschritt im Segment. */
export function getLigaVerticalFillPercents(
  xp: number,
  currentTierId: LigaTierId = CURRENT_LIGA_TIER_ID,
  max: number = LIGA_XP_MAX,
): { bottomPercent: number; heightPercent: number } {
  const { bottomPercent, heightPercent: segmentHeightPercent } =
    getLigaTierSegmentPercents(currentTierId)
  const progress = getLigaProgressFraction(xp, max)
  return {
    bottomPercent,
    heightPercent: progress * segmentHeightPercent,
  }
}

export function getLigaTierTitle(id: LigaTierId, avatarGender: AvatarGender = 'male'): string {
  const titles = LIGA_TIER_TITLES[id]
  return avatarGender === 'female' ? titles.female : titles.male
}

export function getLigaTierById(id: LigaTierId): LigaTier | undefined {
  return LIGA_TIERS.find((tier) => tier.id === id)
}

const LIGA_TIER_ALIASES: Record<string, LigaTierId> = {
  rekrut: 'recruit',
  rekruit: 'recruit',
}

export function normalizeLigaTierId(value: string): LigaTierId {
  const raw = value.trim().toLowerCase()
  if (LIGA_TIER_ALIASES[raw]) return LIGA_TIER_ALIASES[raw]
  if (LIGA_TIERS.some((tier) => tier.id === raw)) {
    return raw as LigaTierId
  }
  return 'recruit'
}

/** `profiles.league` ist in Supabase `smallint` (Index in {@link LIGA_TIERS}). */
export function leagueTierToDbValue(tierId: LigaTierId): number {
  const index = LIGA_TIERS.findIndex((tier) => tier.id === tierId)
  return index >= 0 ? index : 0
}

export function leagueTierFromDbValue(value: unknown): LigaTierId {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const tier = LIGA_TIERS[Math.floor(value)]
    return tier?.id ?? 'recruit'
  }
  if (typeof value === 'string') {
    return normalizeLigaTierId(value)
  }
  return 'recruit'
}

export function getNextLigaTierId(currentTierId: LigaTierId): LigaTierId | null {
  const index = LIGA_TIERS.findIndex((tier) => tier.id === currentTierId)
  if (index < 0 || index >= LIGA_TIERS.length - 1) return null
  return LIGA_TIERS[index + 1]?.id ?? null
}
