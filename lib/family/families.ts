import { newId } from '../newId'
import { getStoredParentId, type FamilySession } from '../familySession'
import { supabase } from '../supabase'
import { familyDbError } from './dbError'
import { generateInviteCode } from './inviteCode'
import { defaultCanAdminForChild, defaultCanAdminForParent } from './memberAdmin'
import {
  defaultPortraitForCategory,
  memberAvatarCategoryForChild,
  memberAvatarCategoryForParent,
  portraitSrc,
} from './memberAvatar'
import { mapParentProfileRow } from './mapParentProfile'
import type { OnboardingMemberProfile } from './onboardingMember'
import type { Family, ParentProfile } from './types'

const RLS_SETUP_HINT =
  'Datenbank-Zugriff blockiert (RLS). Im Supabase SQL Editor einmal supabase/migrate_to_mvp_no_auth.sql ausführen — oder SUPABASE_SERVICE_ROLE_KEY in .env.local setzen und den Dev-Server neu starten.'

function isRlsError(error: Error): boolean {
  return error.message.toLowerCase().includes('row-level security')
}

export async function fetchFamilyById(familyId: string): Promise<{ family: Family | null; error: Error | null }> {
  const { data, error } = await supabase.from('families').select('*').eq('id', familyId).maybeSingle()
  if (error) return { family: null, error: new Error(error.message) }
  return { family: (data as Family | null) ?? null, error: null }
}

export async function fetchParentById(parentId: string): Promise<{ parent: ParentProfile | null; error: Error | null }> {
  const { data, error } = await supabase.from('parent_profiles').select('*').eq('id', parentId).maybeSingle()
  if (error) return { parent: null, error: new Error(error.message) }
  if (!data) return { parent: null, error: null }
  return { parent: mapParentProfileRow(data as Record<string, unknown>), error: null }
}

export function getActiveParentId(): string | null {
  return getStoredParentId()
}

async function resolveFamilyIdByInviteCode(code: string): Promise<{ familyId: string | null; error: Error | null }> {
  const trimmed = code.trim()
  if (!trimmed) return { familyId: null, error: new Error('Bitte einen Einladungscode eingeben.') }

  const { data, error } = await supabase
    .from('families')
    .select('id')
    .ilike('invite_code', trimmed)
    .maybeSingle()

  if (error) return { familyId: null, error: new Error(error.message) }
  if (!data?.id) return { familyId: null, error: new Error('Einladungscode ungültig.') }
  return { familyId: data.id as string, error: null }
}

async function joinFamilyAsParent(
  familyId: string,
  inviteCode: string,
  profile: Extract<OnboardingMemberProfile, { memberKind: 'parent' }>,
): Promise<{ result: FamilySession | null; error: Error | null }> {
  const parentId = newId()

  const parentPortrait = defaultPortraitForCategory(memberAvatarCategoryForParent(profile.gender))

  const { error: parentError } = await supabase.from('parent_profiles').insert({
    id: parentId,
    display_name: profile.displayName,
    gender: profile.gender,
    can_admin: defaultCanAdminForParent(profile.gender),
    avatar_url: parentPortrait ? portraitSrc(parentPortrait) : null,
  })

  if (parentError) {
    if (isRlsError(new Error(parentError.message))) {
      return familyApiFallback(profile, 'join', { inviteCode })
    }
    return { result: null, error: familyDbError(parentError.message) }
  }

  const { error: memberError } = await supabase.from('family_members').insert({
    id: newId(),
    family_id: familyId,
    parent_id: parentId,
    role: 'parent',
  })

  if (memberError) return { result: null, error: familyDbError(memberError.message) }

  return { result: { familyId, memberKind: 'parent', memberId: parentId }, error: null }
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

async function joinFamilyAsChild(
  familyId: string,
  inviteCode: string,
  profile: Extract<OnboardingMemberProfile, { memberKind: 'child' }>,
): Promise<{ result: FamilySession | null; error: Error | null }> {
  const childId = newId()
  const sortOrder = await nextChildSortOrder(familyId)

  const childCategory = memberAvatarCategoryForChild(profile.gender, profile.age)
  const childPortrait = defaultPortraitForCategory(childCategory)

  const { error: childError } = await supabase.from('child_profiles').insert({
    id: childId,
    family_id: familyId,
    display_name: profile.displayName,
    gender: profile.gender,
    age: profile.age,
    can_admin: defaultCanAdminForChild(profile.age),
    avatar_key: childPortrait ?? profile.gender,
    sort_order: sortOrder,
    is_active: true,
    total_xp: 0,
    level: 1,
  })

  if (childError) {
    if (isRlsError(new Error(childError.message))) {
      return familyApiFallback(profile, 'join', { inviteCode })
    }
    return { result: null, error: familyDbError(childError.message) }
  }

  return { result: { familyId, memberKind: 'child', memberId: childId }, error: null }
}

export async function joinFamilyWithInviteCode(
  inviteCode: string,
  profile: OnboardingMemberProfile,
): Promise<{ result: FamilySession | null; error: Error | null }> {
  const { familyId, error: familyError } = await resolveFamilyIdByInviteCode(inviteCode)
  if (familyError || !familyId) return { result: null, error: familyError }

  if (profile.memberKind === 'parent') {
    return joinFamilyAsParent(familyId, inviteCode, profile)
  }
  return joinFamilyAsChild(familyId, inviteCode, profile)
}

async function createFamilyAsParent(
  familyName: string,
  inviteCode: string,
  profile: Extract<OnboardingMemberProfile, { memberKind: 'parent' }>,
): Promise<{ result: FamilySession | null; error: Error | null }> {
  const parentId = newId()
  const familyId = newId()

  const ownerPortrait = defaultPortraitForCategory(memberAvatarCategoryForParent(profile.gender))

  const { error: parentError } = await supabase.from('parent_profiles').insert({
    id: parentId,
    display_name: profile.displayName,
    gender: profile.gender,
    can_admin: defaultCanAdminForParent(profile.gender),
    avatar_url: ownerPortrait ? portraitSrc(ownerPortrait) : null,
  })

  if (parentError) {
    if (isRlsError(new Error(parentError.message))) {
      return familyApiFallback(profile, 'create', { familyName: familyName.trim() })
    }
    return { result: null, error: familyDbError(parentError.message) }
  }

  const { error: familyError } = await supabase.from('families').insert({
    id: familyId,
    name: familyName.trim(),
    invite_code: inviteCode,
  })

  if (familyError) return { result: null, error: familyDbError(familyError.message) }

  const { error: memberError } = await supabase.from('family_members').insert({
    id: newId(),
    family_id: familyId,
    parent_id: parentId,
    role: 'owner',
  })

  if (memberError) return { result: null, error: familyDbError(memberError.message) }

  return { result: { familyId, memberKind: 'parent', memberId: parentId }, error: null }
}

async function createFamilyAsChild(
  familyName: string,
  inviteCode: string,
  profile: Extract<OnboardingMemberProfile, { memberKind: 'child' }>,
): Promise<{ result: FamilySession | null; error: Error | null }> {
  const familyId = newId()
  const childId = newId()

  const { error: familyError } = await supabase.from('families').insert({
    id: familyId,
    name: familyName.trim(),
    invite_code: inviteCode,
  })

  if (familyError) {
    if (isRlsError(new Error(familyError.message))) {
      return familyApiFallback(profile, 'create', { familyName: familyName.trim() })
    }
    return { result: null, error: familyDbError(familyError.message) }
  }

  const creatorCategory = memberAvatarCategoryForChild(profile.gender, profile.age)
  const creatorPortrait = defaultPortraitForCategory(creatorCategory)

  const { error: childError } = await supabase.from('child_profiles').insert({
    id: childId,
    family_id: familyId,
    display_name: profile.displayName,
    gender: profile.gender,
    age: profile.age,
    can_admin: true,
    avatar_key: creatorPortrait ?? profile.gender,
    sort_order: 1,
    is_active: true,
    total_xp: 0,
    level: 1,
  })

  if (childError) return { result: null, error: familyDbError(childError.message) }

  return { result: { familyId, memberKind: 'child', memberId: childId }, error: null }
}

export async function createFamilyWithMember(
  familyName: string,
  profile: OnboardingMemberProfile,
): Promise<{ result: FamilySession | null; error: Error | null }> {
  const name = familyName.trim()
  if (!name) return { result: null, error: new Error('Bitte einen Familiennamen eingeben.') }

  const inviteCode = generateInviteCode()

  if (profile.memberKind === 'parent') {
    return createFamilyAsParent(name, inviteCode, profile)
  }
  return createFamilyAsChild(name, inviteCode, profile)
}

type FamilyApiMode = 'join' | 'create'

async function familyApiFallback(
  profile: OnboardingMemberProfile,
  mode: FamilyApiMode,
  input: { inviteCode?: string; familyName?: string },
): Promise<{ result: FamilySession | null; error: Error | null }> {
  const endpoint = mode === 'join' ? '/api/family/join' : '/api/family/create'
  const body =
    mode === 'join'
      ? { inviteCode: input.inviteCode ?? '', profile }
      : { familyName: input.familyName ?? '', profile }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const payload = (await response.json()) as { result?: FamilySession; error?: string }

  if (!response.ok) {
    const apiMessage = payload.error ?? ''
    const needsRlsFix =
      response.status === 503 ||
      apiMessage.includes('SUPABASE_SERVICE_ROLE_KEY') ||
      apiMessage.toLowerCase().includes('row-level security')
    return {
      result: null,
      error: new Error(needsRlsFix ? RLS_SETUP_HINT : apiMessage || RLS_SETUP_HINT),
    }
  }

  if (!payload.result) {
    return { result: null, error: new Error('Familie konnte nicht verbunden werden.') }
  }

  return { result: payload.result, error: null }
}

export async function fetchFamilyByInviteCode(
  inviteCode: string,
): Promise<{ family: Family | null; error: Error | null }> {
  const code = inviteCode.trim()
  if (!code) return { family: null, error: new Error('Code fehlt.') }

  const { data, error } = await supabase
    .from('families')
    .select('*')
    .ilike('invite_code', code)
    .maybeSingle()

  if (error) return { family: null, error: new Error(error.message) }
  return { family: (data as Family | null) ?? null, error: null }
}
