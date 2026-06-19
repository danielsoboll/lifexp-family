import { supabase } from '../supabase'
import { DEFAULT_FAMILY_QUESTS } from './seedQuests'
import type { Family } from './types'

export async function fetchFamiliesForUser(): Promise<{ families: Family[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return { families: [], error: new Error(error.message) }
  return { families: (data ?? []) as Family[], error: null }
}

export async function fetchFamilyById(familyId: string): Promise<{ family: Family | null; error: Error | null }> {
  const { data, error } = await supabase.from('families').select('*').eq('id', familyId).maybeSingle()
  if (error) return { family: null, error: new Error(error.message) }
  return { family: (data as Family | null) ?? null, error: null }
}

async function insertSeedQuests(familyId: string, userId: string): Promise<Error | null> {
  const rows = DEFAULT_FAMILY_QUESTS.map((quest) => ({
    family_id: familyId,
    child_id: null,
    title: quest.title,
    description: quest.description ?? '',
    xp_reward: quest.xp_reward,
    category: quest.category,
    recurrence: quest.recurrence,
    is_active: true,
    sort_order: quest.sort_order,
    created_by: userId,
  }))

  const { error } = await supabase.from('quests').insert(rows)
  if (error) return new Error(error.message)
  return null
}

export async function createFamilyWithOwner(
  name: string,
  inviteCode?: string,
): Promise<{ familyId: string | null; error: Error | null }> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) return { familyId: null, error: new Error(userError.message) }
  const userId = userData.user?.id
  if (!userId) return { familyId: null, error: new Error('Nicht angemeldet.') }

  const { data, error } = await supabase.rpc('create_family_with_owner', {
    p_name: name.trim(),
    p_invite_code: inviteCode?.trim() || null,
  })

  if (error) return { familyId: null, error: new Error(error.message) }
  const familyId = typeof data === 'string' ? data : null
  if (!familyId) return { familyId: null, error: new Error('Familie konnte nicht angelegt werden.') }

  const seedError = await insertSeedQuests(familyId, userId)
  if (seedError) return { familyId, error: seedError }

  return { familyId, error: null }
}
