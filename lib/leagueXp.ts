import {
  getNextLigaTierId,
  LIGA_XP_MAX,
  type LigaTierId,
  normalizeLigaTierId,
} from './liga'
import { fetchCurrentProfile, updateCurrentLeague } from './profile'
import { supabase } from './supabase'
import { getActiveUserId } from './user'
import { todayEventDate } from './xpEvents'

export const LOGIN_LEAGUE_XP = 2

export const LIFEXP_LEAGUE_CHANGED_EVENT = 'lifexp-league-changed'

export const LEAGUE_XP_SOURCE = {
  login: 'league_login',
  nutrition: 'league_ernaehrung',
  plusTask: 'league_plus_task',
} as const

export function notifyLeagueChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(LIFEXP_LEAGUE_CHANGED_EVENT))
}

type LeagueAwardScope = 'day' | 'lifetime'

async function hasLeagueAward(source: string, scope: LeagueAwardScope): Promise<boolean> {
  const userId = getActiveUserId()
  if (!userId) return false

  let query = supabase
    .from('xp_events')
    .select('id')
    .eq('user_id', userId)
    .eq('category', 'liga')
    .eq('source', source)
    .limit(1)

  if (scope === 'day') {
    query = query.eq('event_date', todayEventDate())
  }

  const { data, error } = await query
  if (error) return false
  return Array.isArray(data) && data.length > 0
}

async function markLeagueAward(source: string): Promise<{ error: Error | null }> {
  const { recordXpEvent } = await import('./xpEvents')
  return recordXpEvent({
    category: 'liga',
    source,
    xp: 0,
    metadata: { league_award: true },
    celebrate: false,
  })
}

/** Liga-Stand aus `profiles.league` / `league_stand` lesen. */
export async function fetchCurrentLeagueStatus(): Promise<{
  tierId: LigaTierId
  stand: number
  error: Error | null
}> {
  const { settings, error } = await fetchCurrentProfile()
  if (error) {
    return { tierId: 'recruit', stand: 0, error }
  }
  return {
    tierId: settings.league,
    stand: settings.leagueStand,
    error: null,
  }
}

/** Liga-XP aufs Profil buchen; bei Erreichen von {@link LIGA_XP_MAX} Aufstieg in die nächste Liga. */
export async function addLeagueXp(delta: number): Promise<{
  tierId: LigaTierId
  stand: number
  promoted: boolean
  error: Error | null
}> {
  const amount = Math.max(0, Math.floor(delta))
  if (amount <= 0) {
    return fetchCurrentLeagueStatus().then((status) => ({ ...status, promoted: false }))
  }

  const { settings, error: fetchError } = await fetchCurrentProfile()
  if (fetchError) {
    return { tierId: 'recruit', stand: 0, promoted: false, error: fetchError }
  }

  let tierId = settings.league
  let stand = settings.leagueStand + amount
  let promoted = false

  while (stand >= LIGA_XP_MAX) {
    const nextTier = getNextLigaTierId(tierId)
    if (!nextTier) {
      stand = LIGA_XP_MAX
      break
    }
    stand -= LIGA_XP_MAX
    tierId = nextTier
    promoted = true
  }

  const { error: updateError } = await updateCurrentLeague(tierId, stand)
  if (updateError) {
    return { tierId: settings.league, stand: settings.leagueStand, promoted: false, error: updateError }
  }

  notifyLeagueChanged()
  return { tierId, stand, promoted, error: null }
}

/** Einmalige Liga-XP-Vergabe (Idempotenz über `xp_events` mit Kategorie `liga`). */
export async function grantLeagueXpOnce({
  source,
  amount = 1,
  scope,
}: {
  source: string
  amount?: number
  scope: LeagueAwardScope
}): Promise<{
  awarded: boolean
  tierId: LigaTierId
  stand: number
  error: Error | null
}> {
  if (await hasLeagueAward(source, scope)) {
    const status = await fetchCurrentLeagueStatus()
    return { awarded: false, tierId: status.tierId, stand: status.stand, error: status.error }
  }

  const { tierId, stand, error: addError } = await addLeagueXp(amount)
  if (addError) {
    return { awarded: false, tierId: 'recruit', stand: 0, error: addError }
  }

  const { error: markError } = await markLeagueAward(source)
  if (markError) {
    return { awarded: false, tierId, stand, error: markError }
  }

  return { awarded: true, tierId, stand, error: null }
}

export async function hasCompletedPlannerTaskBefore(
  userId: string,
  excludeTaskId?: number,
): Promise<boolean> {
  let query = supabase
    .from('tasks')
    .select('id')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .limit(1)

  if (excludeTaskId !== undefined) {
    query = query.neq('id', excludeTaskId)
  }

  const { data, error } = await query
  if (error) return false
  return Array.isArray(data) && data.length > 0
}
