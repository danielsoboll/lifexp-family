import type { DailyXpEventCategory } from './xpEvents'

export const KNOWLEDGE_XP_TARGET = 2

/** Boost-Bereich: Tagesziel 15, normale Skala bis 30, Boost ab 21, max. 40. */
export const XP_BOOST_MAX = 40
export const XP_BOOST_BAR_MAX = 30
export const XP_BOOST_THRESHOLD = 21

export const BEWEGUNG_XP_MAX = XP_BOOST_MAX
export const BEWEGUNG_XP_BAR_MAX = XP_BOOST_BAR_MAX
export const BEWEGUNG_XP_BOOST_THRESHOLD = XP_BOOST_THRESHOLD

export const ERNAEHRUNG_XP_MAX = XP_BOOST_MAX
export const ERNAEHRUNG_XP_BAR_MAX = XP_BOOST_BAR_MAX
export const ERNAEHRUNG_XP_BOOST_THRESHOLD = XP_BOOST_THRESHOLD

/** Tages-Maximum pro Kategorie – unabhängig vom gewählten Hauptziel. */
export const XP_LIMITS: Record<DailyXpEventCategory, number> = {
  bewegung: BEWEGUNG_XP_MAX,
  ernaehrung: ERNAEHRUNG_XP_MAX,
  wissen: 3,
  mein_tag: 20,
  plus: 20,
}

/** Tagesziel (grüner Bereich) pro Kategorie – unabhängig vom gewählten Hauptziel. */
export const XP_TARGETS: Record<DailyXpEventCategory, number> = {
  bewegung: 15,
  ernaehrung: 15,
  wissen: KNOWLEDGE_XP_TARGET,
  mein_tag: 10,
  plus: 10,
}

export type XpBoostUnlockContext = {
  /** Ernährung: Boost erst nach „Abschliessen für heute“. */
  nutritionDayComplete?: boolean
}

export function xpMaxForCategory(category: DailyXpEventCategory): number {
  return XP_LIMITS[category]
}

export function xpTargetForCategory(category: DailyXpEventCategory, _max?: number): number {
  return XP_TARGETS[category]
}

export function xpBoostModeForCategory(category: DailyXpEventCategory): boolean {
  return category === 'bewegung' || category === 'ernaehrung'
}

export function xpBarMaxForCategory(category: DailyXpEventCategory): number | undefined {
  return xpBoostModeForCategory(category) ? XP_BOOST_BAR_MAX : undefined
}

export function xpBoostThresholdForCategory(category: DailyXpEventCategory): number | undefined {
  return xpBoostModeForCategory(category) ? XP_BOOST_THRESHOLD : undefined
}

export function xpBoostUnlockedForCategory(
  category: DailyXpEventCategory,
  context: XpBoostUnlockContext = {},
): boolean {
  if (category === 'ernaehrung') return context.nutritionDayComplete === true
  return true
}
