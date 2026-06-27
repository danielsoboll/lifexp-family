import { memberPortraitTierFromDailyXp } from './dailyXpDisplay'
import { maxPortraitTierForPortraitId, portraitIdFromStored } from './memberAvatar'

/** Kronen-Duell ab Portrait-Stufe 5 (volle Power). */
export const DAILY_CROWN_MIN_PORTRAIT_TIER = 5

export type DailyCrownMember = {
  type: 'parent' | 'child'
  id: string
}

export type DailyCrownMemberInput = DailyCrownMember & {
  todayXp: number
  maxPortraitTier: number
}

export type DailyCrownKind = 'today' | 'yesterday'

function memberKey(member: DailyCrownMember): string {
  return `${member.type}:${member.id}`
}

/** Nur Stufe 5+ — höchste Tages-XP gewinnt. */
export function resolveDailyCrownWinner(members: DailyCrownMemberInput[]): DailyCrownMember | null {
  let best: DailyCrownMemberInput | null = null

  for (const member of members) {
    const tier = memberPortraitTierFromDailyXp(member.todayXp, member.maxPortraitTier)
    if (tier < DAILY_CROWN_MIN_PORTRAIT_TIER) continue
    if (!best || member.todayXp > best.todayXp) {
      best = member
      continue
    }
    if (member.todayXp === best.todayXp) {
      const order = member.type === 'parent' ? 0 : 1
      const bestOrder = best.type === 'parent' ? 0 : 1
      if (order < bestOrder || (order === bestOrder && member.id.localeCompare(best.id) < 0)) {
        best = member
      }
    }
  }

  return best ? { type: best.type, id: best.id } : null
}

export function resolveDailyCrownForMember(
  member: DailyCrownMember,
  todayWinner: DailyCrownMember | null,
  yesterdayWinner: DailyCrownMember | null,
): DailyCrownKind | null {
  const key = memberKey(member)
  if (yesterdayWinner && memberKey(yesterdayWinner) === key) return 'yesterday'
  if (todayWinner && memberKey(todayWinner) === key) return 'today'
  return null
}

export function buildDailyCrownCandidates(input: {
  parents: ReadonlyArray<{ id: string; avatar_url?: string | null; todayXp?: number }>
  children: ReadonlyArray<{ id: string; portrait_id?: string | null; todayXp?: number }>
  parentXp?: Record<string, number>
  childXp?: Record<string, number>
}): DailyCrownMemberInput[] {
  const rows: DailyCrownMemberInput[] = []

  for (const parent of input.parents) {
    const portraitId = portraitIdFromStored(parent.avatar_url ?? null)
    rows.push({
      type: 'parent',
      id: parent.id,
      todayXp: input.parentXp?.[parent.id] ?? parent.todayXp ?? 0,
      maxPortraitTier: maxPortraitTierForPortraitId(portraitId),
    })
  }

  for (const child of input.children) {
    rows.push({
      type: 'child',
      id: child.id,
      todayXp: input.childXp?.[child.id] ?? child.todayXp ?? 0,
      maxPortraitTier: maxPortraitTierForPortraitId(child.portrait_id ?? null),
    })
  }

  return rows
}

export function dailyCrownWinnerName(input: {
  winner: DailyCrownMember | null
  parents: ReadonlyArray<{ id: string; display_name: string; gender?: string }>
  children: ReadonlyArray<{ id: string; display_name: string }>
  formatParentName?: (name: string, gender?: string) => string
}): string | null {
  if (!input.winner) return null
  if (input.winner.type === 'parent') {
    const parent = input.parents.find((row) => row.id === input.winner!.id)
    if (!parent) return null
    return input.formatParentName
      ? input.formatParentName(parent.display_name, parent.gender)
      : parent.display_name
  }
  return input.children.find((row) => row.id === input.winner!.id)?.display_name ?? null
}
