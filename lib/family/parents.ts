import { newId } from '../newId'
import { getStoredFamilyId } from '../familySession'
import { mapParentProfileRow } from './mapParentProfile'
import { defaultCanAdminForParent } from './memberAdmin'
import {
  coercePortraitForCategory,
  memberAvatarCategoryForParent,
  portraitSrc,
  type AvatarPortraitId,
} from './memberAvatar'
import { nextAccentKeyForFamily } from './memberAccentAssign'
import { supabase } from '../supabase'
import type { MemberAccentKey } from './memberAccentColor'
import type { ParentGender } from './memberGender'
import type { ParentProfile } from './types'

export type CreateParentInput = {
  familyId: string
  displayName: string
  gender: ParentGender
  portraitId?: AvatarPortraitId | null
  canAdmin?: boolean
}

export type UpdateParentInput = {
  displayName?: string
  gender?: ParentGender
  canAdmin?: boolean
  avatarUrl?: string | null
  accentKey?: MemberAccentKey
}

export async function createParentForFamily(
  input: CreateParentInput,
): Promise<{ parent: ParentProfile | null; error: Error | null }> {
  const storedFamilyId = getStoredFamilyId()
  if (!storedFamilyId || storedFamilyId !== input.familyId) {
    return { parent: null, error: new Error('Keine gültige Familien-Session.') }
  }

  const displayName = input.displayName.trim()
  if (!displayName) {
    return { parent: null, error: new Error('Bitte einen Namen eingeben.') }
  }

  const parentId = newId()
  const category = memberAvatarCategoryForParent(input.gender)
  const portraitId = coercePortraitForCategory(category, input.portraitId ?? null)
  const canAdmin = input.canAdmin ?? defaultCanAdminForParent(input.gender)
  const { accentKey, error: accentError } = await nextAccentKeyForFamily(input.familyId)
  if (accentError) return { parent: null, error: accentError }

  const { error: parentError } = await supabase.from('parent_profiles').insert({
    id: parentId,
    display_name: displayName,
    gender: input.gender,
    can_admin: canAdmin,
    avatar_url: portraitId ? portraitSrc(portraitId) : null,
    accent_key: accentKey,
  })

  if (parentError) {
    return { parent: null, error: new Error(parentError.message) }
  }

  const { error: memberError } = await supabase.from('family_members').insert({
    id: newId(),
    family_id: input.familyId,
    parent_id: parentId,
    role: 'parent',
  })

  if (memberError) {
    return { parent: null, error: new Error(memberError.message) }
  }

  const { data, error } = await supabase.from('parent_profiles').select('*').eq('id', parentId).single()
  if (error) return { parent: null, error: new Error(error.message) }
  return { parent: mapParentProfileRow(data as Record<string, unknown>), error: null }
}

export async function updateParent(
  parentId: string,
  input: UpdateParentInput,
): Promise<{ parent: ParentProfile | null; error: Error | null }> {
  const patch: Record<string, string | boolean | null> = {}

  if (input.displayName !== undefined) {
    const name = input.displayName.trim()
    if (!name) return { parent: null, error: new Error('Bitte einen Namen eingeben.') }
    patch.display_name = name
  }

  if (input.gender !== undefined) {
    patch.gender = input.gender
  }

  if (input.canAdmin !== undefined) {
    patch.can_admin = input.canAdmin
  }

  if (input.avatarUrl !== undefined) {
    patch.avatar_url = input.avatarUrl
  }

  if (input.accentKey !== undefined) {
    patch.accent_key = input.accentKey
  }

  if (Object.keys(patch).length === 0) {
    return { parent: null, error: new Error('Nichts zu speichern.') }
  }

  const { data, error } = await supabase.from('parent_profiles').update(patch).eq('id', parentId).select('*').single()

  if (error) return { parent: null, error: new Error(error.message) }
  return { parent: mapParentProfileRow(data as Record<string, unknown>), error: null }
}
