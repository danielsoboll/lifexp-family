import { getStoredFamilyId } from '../familySession'
import { supabase } from '../supabase'
import { mapChildProfileRow, mapChildProfileRows } from './mapChildProfile'
import { defaultCanAdminForChild } from './memberAdmin'
import { isChildLimitReached } from './memberLimits'
import { coerceOnboardingPortrait, type AvatarPortraitId } from './memberAvatar'
import { nextAccentKeyForFamily } from './memberAccentAssign'
import {
  generateUniqueMemberRecoveryCode,
  memberRecoveryInsertFields,
} from './memberRecoveryCode'
import type { ChildGender } from './memberGender'
import type { ChildProfile } from './types'

export type CreateChildInput = {
  familyId: string
  displayName: string
  age?: number | null
  gender: ChildGender
  portraitId?: AvatarPortraitId | null
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
  const { data, error } = await supabase.from('child_profiles').select('*').eq('id', childId).maybeSingle()
  if (error) return { child: null, error: new Error(error.message) }
  if (!data) return { child: null, error: null }
  return { child: mapChildProfileRow(data), error: null }
}

export async function createChild(input: CreateChildInput): Promise<{ child: ChildProfile | null; error: Error | null }> {
  const storedFamilyId = getStoredFamilyId()
  if (!storedFamilyId || storedFamilyId !== input.familyId) {
    return { child: null, error: new Error('Keine gültige Familien-Session.') }
  }

  const displayName = input.displayName.trim()
  if (!displayName) {
    return { child: null, error: new Error('Bitte einen Namen eingeben.') }
  }

  const { children: existingChildren, error: countError } = await fetchChildrenForFamily(input.familyId)
  if (countError) {
    return { child: null, error: countError }
  }
  if (isChildLimitReached(existingChildren.length)) {
    return { child: null, error: new Error('Maximal 6 Kinder pro Familie.') }
  }

  const sortOrder = await nextChildSortOrder(input.familyId)
  const portraitId = coerceOnboardingPortrait(input.gender, input.portraitId ?? null)
  const { accentKey, error: accentError } = await nextAccentKeyForFamily(input.familyId)
  if (accentError) {
    return { child: null, error: accentError }
  }

  let recoveryCode: string
  try {
    recoveryCode = await generateUniqueMemberRecoveryCode(supabase)
  } catch (error) {
    return {
      child: null,
      error: error instanceof Error ? error : new Error('Recovery-Code konnte nicht erzeugt werden.'),
    }
  }

  const { data, error } = await supabase
    .from('child_profiles')
    .insert({
      family_id: input.familyId,
      display_name: displayName,
      gender: input.gender,
      age: input.age ?? null,
      can_admin: defaultCanAdminForChild(input.age ?? null),
      avatar_key: portraitId ?? input.gender,
      sort_order: sortOrder,
      is_active: true,
      total_xp: 0,
      level: 1,
      accent_key: accentKey,
      ...memberRecoveryInsertFields(recoveryCode),
    })
    .select('*')
    .single()

  if (error) {
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
  patch: Partial<
    Pick<ChildProfile, 'display_name' | 'gender' | 'age' | 'can_admin' | 'portrait_id' | 'notes' | 'is_active' | 'accent_key'>
  >,
): Promise<{ error: Error | null }> {
  const dbPatch: Record<string, unknown> = { ...patch }

  if (patch.portrait_id !== undefined) {
    dbPatch.avatar_key = patch.portrait_id
    delete dbPatch.portrait_id
  }

  if (patch.gender !== undefined || patch.age !== undefined) {
    // Portrait bei Rollen-/Alterswechsel anpassen, wenn nötig — erfolgt beim Save im Editor
  }

  const { error } = await supabase.from('child_profiles').update(dbPatch).eq('id', childId)
  if (error) return { error: new Error(error.message) }
  return { error: null }
}
