import type { AreaButtonStatus } from '../components/HomeScreen'
import { XP_LIMITS, xpTargetForCategory } from './xpDisplay'
import type { TodayXpByCategory } from './xpEvents'
import { fetchZielvorgabenComplete } from './zielvorgaben'

export type StreakPrompt = 'overview' | 'wissen' | null

export type HomeFlowInput = {
  hasLoginEvent: boolean
  allKnowledgeAnswered: boolean
  meinTagFilled: boolean
  bewegungSubFilled?: boolean
  nutritionSubFilled?: boolean
  plusSubFilled?: boolean
  todayXp: TodayXpByCategory
}

export type HomeFlowState = {
  streakPrompt: StreakPrompt
  showTaskPlannerHint: boolean
  showZieleHint: boolean
  areaStatuses: {
    bewegung?: AreaButtonStatus
    ernaehrung?: AreaButtonStatus
    wissen?: AreaButtonStatus
    meinTag?: AreaButtonStatus
    plus?: AreaButtonStatus
  }
}

function areaStatusForXp(
  xp: number,
  target: number,
  subAreaComplete = false,
): AreaButtonStatus {
  if (xp >= target) return 'done'
  if (subAreaComplete) return 'subdone'
  return undefined
}

function wissenAreaStatus(
  hasLoginEvent: boolean,
  allKnowledgeAnswered: boolean,
  xp: number,
  target: number,
): AreaButtonStatus {
  if (xp >= target) return 'done'
  if (allKnowledgeAnswered) return 'subdone'
  if (!hasLoginEvent) return undefined
  return 'pending'
}

/** Tagesablauf: Streak 1 Übersicht → Streak 2 Wissen → nur Mein Tag pending. */
export function computeHomeFlowState(input: HomeFlowInput): HomeFlowState {
  const { hasLoginEvent, allKnowledgeAnswered, meinTagFilled, todayXp } = input
  const meinTagTarget = xpTargetForCategory('mein_tag', XP_LIMITS.mein_tag)

  const streakPrompt: StreakPrompt = !hasLoginEvent
    ? allKnowledgeAnswered
      ? null
      : 'overview'
    : allKnowledgeAnswered
      ? null
      : 'wissen'

  const meinTagPhase = allKnowledgeAnswered
  const meinTagPending = meinTagPhase && !meinTagFilled && todayXp.meinTag < meinTagTarget

  return {
    streakPrompt,
    showTaskPlannerHint: meinTagPhase && !meinTagFilled,
    showZieleHint: false,
    areaStatuses: {
      bewegung: areaStatusForXp(
        todayXp.bewegung,
        xpTargetForCategory('bewegung', XP_LIMITS.bewegung),
        input.bewegungSubFilled ?? false,
      ),
      ernaehrung: areaStatusForXp(
        todayXp.ernaehrung,
        xpTargetForCategory('ernaehrung', XP_LIMITS.ernaehrung),
        input.nutritionSubFilled ?? false,
      ),
      wissen: wissenAreaStatus(
        hasLoginEvent,
        allKnowledgeAnswered,
        todayXp.wissen,
        xpTargetForCategory('wissen', XP_LIMITS.wissen),
      ),
      meinTag: !meinTagPhase
        ? undefined
        : todayXp.meinTag >= meinTagTarget
          ? 'done'
          : !meinTagFilled
            ? 'pending'
            : 'subdone',
      plus: areaStatusForXp(
        todayXp.plus,
        xpTargetForCategory('plus', XP_LIMITS.plus),
        input.plusSubFilled ?? false,
      ),
    },
  }
}

export async function enrichHomeFlowWithZieleHint(flow: HomeFlowState): Promise<HomeFlowState> {
  const { complete } = await fetchZielvorgabenComplete()
  if (complete) {
    return flow
  }

  return { ...flow, showZieleHint: true }
}

function yesterdayAreaStatus(
  xp: number,
  target: number,
  subComplete: boolean,
): AreaButtonStatus {
  if (xp >= target) return 'done'
  if (subComplete) return 'subdone'
  return undefined
}

/** Gestern-Modus: keine Streaks/Pfeile, nur grüne „erledigt“-Ränder bei Fortschritt. */
export function computeYesterdayHomeFlowState(input: HomeFlowInput): HomeFlowState {
  return {
    streakPrompt: null,
    showTaskPlannerHint: false,
    showZieleHint: false,
    areaStatuses: {
      bewegung: yesterdayAreaStatus(
        input.todayXp.bewegung,
        xpTargetForCategory('bewegung', XP_LIMITS.bewegung),
        input.bewegungSubFilled ?? false,
      ),
      ernaehrung: yesterdayAreaStatus(
        input.todayXp.ernaehrung,
        xpTargetForCategory('ernaehrung', XP_LIMITS.ernaehrung),
        input.nutritionSubFilled ?? false,
      ),
      wissen: wissenAreaStatus(
        true,
        input.allKnowledgeAnswered,
        input.todayXp.wissen,
        xpTargetForCategory('wissen', XP_LIMITS.wissen),
      ),
      meinTag: yesterdayAreaStatus(
        input.todayXp.meinTag,
        xpTargetForCategory('mein_tag', XP_LIMITS.mein_tag),
        input.meinTagFilled,
      ),
      plus: yesterdayAreaStatus(
        input.todayXp.plus,
        xpTargetForCategory('plus', XP_LIMITS.plus),
        input.plusSubFilled ?? false,
      ),
    },
  }
}
