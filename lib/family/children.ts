import { supabase } from '../supabase'
import type { ChildProfile } from './types'

export type CreateChildInput = {
  familyId: string
  displayName: string
  birthYear?: number | null
  avatarKey?: string
}

export async function fetchChildrenForFamily(
  familyId: string,
): Promise<{ children: ChildProfile[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('child_profiles')
    .select('*')
    .eq('family_id', familyId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('display_name', { ascending: true })

  if (error) return { children: [], error: new Error(error.message) }
  return { children: (data ?? []) as ChildProfile[], error: null }
}

export async function fetchChildById(
  childId: string,
): Promise<{ child: ChildProfile | null; error: Error | null }> {
  const { data, error } = await supabase.from('child_profiles').select('*').eq('id', childId).maybeSingle()
  if (error) return { child: null, error: new Error(error.message) }
  return { child: (data as ChildProfile | null) ?? null, error: null }
}

export async function createChild(input: CreateChildInput): Promise<{ child: ChildProfile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('child_profiles')
    .insert({
      family_id: input.familyId,
      display_name: input.displayName.trim(),
      birth_year: input.birthYear ?? null,
      avatar_key: input.avatarKey ?? 'default',
    })
    .select('*')
    .single()

  if (error) return { child: null, error: new Error(error.message) }
  return { child: data as ChildProfile, error: null }
}

export async function updateChild(
  childId: string,
  patch: Partial<Pick<ChildProfile, 'display_name' | 'birth_year' | 'avatar_key' | 'notes' | 'is_active'>>,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('child_profiles').update(patch).eq('id', childId)
  if (error) return { error: new Error(error.message) }
  return { error: null }
}
