import { fetchProfileByUsername } from './profile'
import { supabase } from './supabase'
import { normalizeUsername } from './user'

const USER_SCOPED_TABLES = [
  'xp_events',
  'meal_entries',
  'daily_scores',
  'tasks',
  'week_plan',
  'food_items_indiv',
  'task_colors_indiv',
] as const

async function deleteUserRowsFromTable(
  table: (typeof USER_SCOPED_TABLES)[number],
  userId: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from(table).delete().eq('user_id', userId)
  if (error) {
    return { error: new Error(`${table}: ${error.message}`) }
  }
  return { error: null }
}

async function deleteProfileRow(username: string): Promise<{ error: Error | null; deleted: boolean }> {
  const { data, error } = await supabase
    .from('profiles')
    .delete()
    .eq('username', username)
    .select('username')

  if (error) {
    return { error: new Error(`profiles: ${error.message}`), deleted: false }
  }

  return { deleted: (data?.length ?? 0) > 0, error: null }
}

/**
 * Alle Server-Daten eines Benutzers löschen (Kind-Tabellen zuerst, Profil zuletzt).
 * Gibt einen Fehler zurück, wenn ein Profil existiert aber nicht gelöscht werden konnte.
 */
export async function deleteAllUserDataFromServer(username: string): Promise<{ error: Error | null }> {
  const userId = normalizeUsername(username)
  if (!userId) {
    return { error: new Error('Kein gültiger Benutzername.') }
  }

  const { row: existingProfile } = await fetchProfileByUsername(userId)

  for (const table of USER_SCOPED_TABLES) {
    const { error } = await deleteUserRowsFromTable(table, userId)
    if (error) return { error }
  }

  if (!existingProfile) {
    return { error: null }
  }

  const { error, deleted } = await deleteProfileRow(userId)
  if (error) return { error }
  if (!deleted) {
    const { row: stillThere } = await fetchProfileByUsername(userId)
    if (stillThere) {
      return {
        error: new Error(
          'Profil konnte nicht gelöscht werden. Bitte in Supabase die DELETE-Policy für profiles ausführen (supabase/user_data_delete_policies.sql).',
        ),
      }
    }
  }

  return { error: null }
}
