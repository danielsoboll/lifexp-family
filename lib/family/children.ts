import { requireSupabaseUserId, supabase } from '../supabase'
import { mapChildProfileRow, mapChildProfileRows } from './mapChildProfile'
import type { ChildProfile } from './types'

export type CreateChildInput = {
  familyId: string
  displayName: string
  birthYear?: number | null
  avatarKey?: string
}

async function nextChildSortOrder(familyId: string): Promise<number> {
  const { data } = await supabase
    .from('child_profiles')
    .select('sort_order')
    .eq('family_id', familyId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const current = data?.[0]?.sort_order
  return (typeof current === 'number' ? current : 0) + 1
}

export async function fetchChildrenForFamily(
  familyId: string,
): Promise<{ children: ChildProfile[]; error: Error | null }> {
  const { error: authError } = await requireSupabaseUserId()
  if (authError) return { children: [], error: authError }

  const { data, error } = await supabase
    .from('child_profiles')
    .select('*')
    .eq('family_id', familyId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('display_name', { ascending: true })

  if (error) return { children: [], error: new Error(error.message) }
  return { children: mapChildProfileRows(data), error: null }
}

export async function fetchChildById(
  childId: string,
): Promise<{ child: ChildProfile | null; error: Error | null }> {
  const { error: authError } = await requireSupabaseUserId()
  if (authError) return { child: null, error: authError }

  const { data, error } = await supabase.from('child_profiles').select('*').eq('id', childId).maybeSingle()
  if (error) return { child: null, error: new Error(error.message) }
  if (!data) return { child: null, error: null }
  return { child: mapChildProfileRow(data), error: null }
}

export async function createChild(input: CreateChildInput): Promise<{ child: ChildProfile | null; error: Error | null }> {
  const { error: authError } = await requireSupabaseUserId()
  if (authError) return { child: null, error: authError }

  const displayName = input.displayName.trim()
  if (!displayName) {
    return { child: null, error: new Error('Bitte einen Namen eingeben.') }
  }

  const sortOrder = await nextChildSortOrder(input.familyId)

  const { data, error } = await supabase
    .from('child_profiles')
    .insert({
      family_id: input.familyId,
      display_name: displayName,
      birth_year: input.birthYear ?? null,
      avatar_key: input.avatarKey ?? 'default',
      sort_order: sortOrder,
      is_active: true,
      total_xp: 0,
      level: 1,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '42501') {
      return { child: null, error: new Error('Keine Berechtigung — bist du Mitglied dieser Familie?') }
    }
    return { child: null, error: new Error(error.message) }
  }

  const child = mapChildProfileRow(data)
  if (!child) {
    return { child: null, error: new Error('Kind gespeichert, Antwort konnte nicht gelesen werden.') }
  }

  return { child, error: null }
}

export async function updateChild(
  childId: string,
  patch: Partial<Pick<ChildProfile, 'display_name' | 'birth_year' | 'avatar_key' | 'notes' | 'is_active'>>,
): Promise<{ error: Error | null }> {
  const { error: authError } = await requireSupabaseUserId()
  if (authError) return { error: authError }

  const { error } = await supabase.from('child_profiles').update(patch).eq('id', childId)
  if (error) return { error: new Error(error.message) }
  return { error: null }
}
