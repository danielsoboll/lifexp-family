import { newId } from '../newId'
import { getStoredFamilyId, getStoredParentId, readFamilySession, type FamilySession } from '../familySession'
import { supabase } from '../supabase'
import { withSupabaseRlsContextAsync } from '../supabaseRlsContext'
import { familyDbError } from './dbError'
import { generateInviteCode } from './inviteCode'
import { defaultCanAdminForChild, defaultCanAdminForParent } from './memberAdmin'
import {
  childPortraitKeyForOnboarding,
  parentAvatarUrlForOnboarding,
  type FamilyOnboardingResult,
  type OnboardingDevicePrefs,
  type OnboardingMemberProfile,
} from './onboardingMember'
import { mapParentProfileRow } from './mapParentProfile'
import { nextAccentKeyForFamily } from './memberAccentAssign'
import { mapFamilyRow } from './mapFamily'
import { pickAccentKeyByIndex, type MemberAccentKey } from './memberAccentColor'
import {
  generateUniqueMemberRecoveryCode,
  memberRecoveryInsertFields,
} from './memberRecoveryCode'
import type { ClaimableMember, ClaimMemberInput } from './claimableMembers'
import { claimFamilyMemberDirect, fetchClaimableMembersDirect } from './joinFamilyClaim'
import type { Family, ParentProfile } from './types'

const RLS_SETUP_HINT =
  'Datenbank-Zugriff blockiert (RLS). Im Supabase SQL Editor einmal supabase/migrate_to_mvp_no_auth.sql ausführen.'

function isRlsError(error: Error): boolean {
  return error.message.toLowerCase().includes('row-level security')
}

export async function fetchFamilyById(familyId: string): Promise<{ family: Family | null; error: Error | null }> {
  const { data, error } = await supabase.from('families').select('*').eq('id', familyId).maybeSingle()
  if (error) return { family: null, error: new Error(error.message) }
  if (!data) return { family: null, error: null }
  return { family: mapFamilyRow(data as Record<string, unknown>), error: null }
}

export async function updateFamilyAccentKey(
  familyId: string,
  accentKey: MemberAccentKey,
): Promise<{ error: Error | null }> {
  const session = readFamilySession()
  if (!session || session.familyId !== familyId) {
    return { error: new Error('Keine gültige Familien-Session.') }
  }

  const { error } = await supabase
    .from('families')
    .update({ accent_key: accentKey, updated_at: new Date().toISOString() })
    .eq('id', familyId)

  if (error) return { error: new Error(error.message) }
  return { error: null }
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
  devicePrefs?: OnboardingDevicePrefs,
): Promise<{ result: FamilyOnboardingResult | null; error: Error | null }> {
  const parentId = newId()
  let recoveryCode: string
  try {
    recoveryCode = await generateUniqueMemberRecoveryCode(supabase)
  } catch (error) {
    return { result: null, error: error instanceof Error ? error : new Error('Recovery-Code fehlgeschlagen.') }
  }

  const parentPortraitUrl = parentAvatarUrlForOnboarding(profile)
  const { accentKey, error: accentError } = await nextAccentKeyForFamily(familyId)
  if (accentError) return { result: null, error: accentError }

  const { error: parentError } = await supabase.from('parent_profiles').insert({
    id: parentId,
    display_name: profile.displayName,
    gender: profile.gender,
    can_admin: defaultCanAdminForParent(profile.gender),
    avatar_url: parentPortraitUrl,
    accent_key: accentKey,
    ...memberRecoveryInsertFields(recoveryCode, devicePrefs),
  })

  if (parentError) {
    if (isRlsError(new Error(parentError.message))) {
      return familyApiFallback(profile, 'join', { inviteCode, devicePrefs })
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

  return {
    result: {
      session: { familyId, memberKind: 'parent', memberId: parentId },
      recoveryCode,
    },
    error: null,
  }
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
  devicePrefs?: OnboardingDevicePrefs,
): Promise<{ result: FamilyOnboardingResult | null; error: Error | null }> {
  const childId = newId()
  const sortOrder = await nextChildSortOrder(familyId)
  let recoveryCode: string
  try {
    recoveryCode = await generateUniqueMemberRecoveryCode(supabase)
  } catch (error) {
    return { result: null, error: error instanceof Error ? error : new Error('Recovery-Code fehlgeschlagen.') }
  }

  const childPortrait = childPortraitKeyForOnboarding(profile)
  const { accentKey, error: accentError } = await nextAccentKeyForFamily(familyId)
  if (accentError) return { result: null, error: accentError }

  const { error: childError } = await supabase.from('child_profiles').insert({
    id: childId,
    family_id: familyId,
    display_name: profile.displayName,
    gender: profile.gender,
    age: profile.age,
    can_admin: defaultCanAdminForChild(profile.age),
    avatar_key: childPortrait,
    sort_order: sortOrder,
    is_active: true,
    total_xp: 0,
    level: 1,
    accent_key: accentKey,
    ...memberRecoveryInsertFields(recoveryCode, devicePrefs),
  })

  if (childError) {
    if (isRlsError(new Error(childError.message))) {
      return familyApiFallback(profile, 'join', { inviteCode, devicePrefs })
    }
    return { result: null, error: familyDbError(childError.message) }
  }

  return {
    result: {
      session: { familyId, memberKind: 'child', memberId: childId },
      recoveryCode,
    },
    error: null,
  }
}

export async function joinFamilyWithInviteCode(
  inviteCode: string,
  profile: OnboardingMemberProfile,
  devicePrefs?: OnboardingDevicePrefs,
): Promise<{ result: FamilyOnboardingResult | null; error: Error | null }> {
  return withSupabaseRlsContextAsync({ onboarding: 'join', inviteCode }, async () => {
    const { familyId, error: familyError } = await resolveFamilyIdByInviteCode(inviteCode)
    if (familyError || !familyId) return { result: null, error: familyError }

    if (profile.memberKind === 'parent') {
      return joinFamilyAsParent(familyId, inviteCode, profile, devicePrefs)
    }
    return joinFamilyAsChild(familyId, inviteCode, profile, devicePrefs)
  })
}

async function createFamilyAsParent(
  familyName: string,
  inviteCode: string,
  profile: Extract<OnboardingMemberProfile, { memberKind: 'parent' }>,
  devicePrefs?: OnboardingDevicePrefs,
): Promise<{ result: FamilyOnboardingResult | null; error: Error | null }> {
  const parentId = newId()
  const familyId = newId()
  let recoveryCode: string
  try {
    recoveryCode = await generateUniqueMemberRecoveryCode(supabase)
  } catch (error) {
    return { result: null, error: error instanceof Error ? error : new Error('Recovery-Code fehlgeschlagen.') }
  }

  const ownerPortraitUrl = parentAvatarUrlForOnboarding(profile)

  const { error: parentError } = await supabase.from('parent_profiles').insert({
    id: parentId,
    display_name: profile.displayName,
    gender: profile.gender,
    can_admin: defaultCanAdminForParent(profile.gender),
    avatar_url: ownerPortraitUrl,
    accent_key: pickAccentKeyByIndex(0),
    ...memberRecoveryInsertFields(recoveryCode, devicePrefs),
  })

  if (parentError) {
    if (isRlsError(new Error(parentError.message))) {
      return familyApiFallback(profile, 'create', { familyName: familyName.trim(), devicePrefs })
    }
    return { result: null, error: familyDbError(parentError.message) }
  }

  const { error: familyError } = await supabase.from('families').insert({
    id: familyId,
    name: familyName.trim(),
    invite_code: inviteCode,
    accent_key: 'lavender',
  })

  if (familyError) return { result: null, error: familyDbError(familyError.message) }

  const { error: memberError } = await supabase.from('family_members').insert({
    id: newId(),
    family_id: familyId,
    parent_id: parentId,
    role: 'owner',
  })

  if (memberError) return { result: null, error: familyDbError(memberError.message) }

  return {
    result: {
      session: { familyId, memberKind: 'parent', memberId: parentId },
      recoveryCode,
    },
    error: null,
  }
}

async function createFamilyAsChild(
  familyName: string,
  inviteCode: string,
  profile: Extract<OnboardingMemberProfile, { memberKind: 'child' }>,
  devicePrefs?: OnboardingDevicePrefs,
): Promise<{ result: FamilyOnboardingResult | null; error: Error | null }> {
  const familyId = newId()
  const childId = newId()
  let recoveryCode: string
  try {
    recoveryCode = await generateUniqueMemberRecoveryCode(supabase)
  } catch (error) {
    return { result: null, error: error instanceof Error ? error : new Error('Recovery-Code fehlgeschlagen.') }
  }

  const { error: familyError } = await supabase.from('families').insert({
    id: familyId,
    name: familyName.trim(),
    invite_code: inviteCode,
    accent_key: 'lavender',
  })

  if (familyError) {
    if (isRlsError(new Error(familyError.message))) {
      return familyApiFallback(profile, 'create', { familyName: familyName.trim(), devicePrefs })
    }
    return { result: null, error: familyDbError(familyError.message) }
  }

  const creatorPortrait = childPortraitKeyForOnboarding(profile)

  const { error: childError } = await supabase.from('child_profiles').insert({
    id: childId,
    family_id: familyId,
    display_name: profile.displayName,
    gender: profile.gender,
    age: profile.age,
    can_admin: true,
    avatar_key: creatorPortrait,
    sort_order: 1,
    is_active: true,
    total_xp: 0,
    level: 1,
    accent_key: pickAccentKeyByIndex(0),
    ...memberRecoveryInsertFields(recoveryCode, devicePrefs),
  })

  if (childError) return { result: null, error: familyDbError(childError.message) }

  return {
    result: {
      session: { familyId, memberKind: 'child', memberId: childId },
      recoveryCode,
    },
    error: null,
  }
}

export async function createFamilyWithMember(
  familyName: string,
  profile: OnboardingMemberProfile,
  devicePrefs?: OnboardingDevicePrefs,
): Promise<{ result: FamilyOnboardingResult | null; error: Error | null }> {
  const name = familyName.trim()
  if (!name) return { result: null, error: new Error('Bitte einen Familiennamen eingeben.') }

  const inviteCode = generateInviteCode()

  return withSupabaseRlsContextAsync({ onboarding: 'create' }, async () => {
    if (profile.memberKind === 'parent') {
      return createFamilyAsParent(name, inviteCode, profile, devicePrefs)
    }
    return createFamilyAsChild(name, inviteCode, profile, devicePrefs)
  })
}

type FamilyApiMode = 'join' | 'create'

async function familyApiFallback(
  profile: OnboardingMemberProfile,
  mode: FamilyApiMode,
  input: { inviteCode?: string; familyName?: string; devicePrefs?: OnboardingDevicePrefs },
): Promise<{ result: FamilyOnboardingResult | null; error: Error | null }> {
  const endpoint = mode === 'join' ? '/api/family/join' : '/api/family/create'
  const body =
    mode === 'join'
      ? { inviteCode: input.inviteCode ?? '', profile, devicePrefs: input.devicePrefs }
      : { familyName: input.familyName ?? '', profile, devicePrefs: input.devicePrefs }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const payload = (await response.json()) as {
    result?: FamilySession
    recoveryCode?: string
    error?: string
  }

  if (!response.ok) {
    const apiMessage = payload.error ?? ''
    const needsRlsFix =
      apiMessage.toLowerCase().includes('row-level security') ||
      apiMessage.toLowerCase().includes('permission denied')
    return {
      result: null,
      error: new Error(needsRlsFix ? RLS_SETUP_HINT : apiMessage || RLS_SETUP_HINT),
    }
  }

  if (!payload.result || !payload.recoveryCode) {
    return { result: null, error: new Error('Familie konnte nicht verbunden werden.') }
  }

  return {
    result: { session: payload.result, recoveryCode: payload.recoveryCode },
    error: null,
  }
}

export async function fetchClaimableMembers(
  inviteCode: string,
): Promise<{ members: ClaimableMember[]; error: Error | null }> {
  const code = inviteCode.trim()
  if (!code) return { members: [], error: new Error('Bitte einen Einladungscode eingeben.') }

  return withSupabaseRlsContextAsync({ inviteCode: code }, async () => {
    const direct = await fetchClaimableMembersDirect(supabase, code)
    if (!direct.error || !isRlsError(direct.error)) {
      return direct
    }

    try {
      const response = await fetch('/api/family/join/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code }),
      })
      const payload = (await response.json()) as { members?: ClaimableMember[]; error?: string }
      if (!response.ok) {
        const apiMessage = payload.error ?? ''
        const needsRlsFix =
          apiMessage.toLowerCase().includes('row-level security') ||
          apiMessage.toLowerCase().includes('permission denied')
        return {
          members: [],
          error: new Error(needsRlsFix ? RLS_SETUP_HINT : apiMessage || 'Profile konnten nicht geladen werden.'),
        }
      }
      return { members: payload.members ?? [], error: null }
    } catch {
      return { members: [], error: new Error('Profile konnten nicht geladen werden.') }
    }
  })
}

export async function claimFamilyMember(
  inviteCode: string,
  claim: ClaimMemberInput,
  devicePrefs?: OnboardingDevicePrefs,
): Promise<{ result: FamilyOnboardingResult | null; error: Error | null }> {
  return withSupabaseRlsContextAsync({ onboarding: 'join', inviteCode }, async () => {
    const direct = await claimFamilyMemberDirect(supabase, inviteCode, claim, devicePrefs)
    if (!direct.error || !isRlsError(direct.error)) {
      return direct
    }

    try {
      const response = await fetch('/api/family/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode, claim, devicePrefs }),
      })
      const payload = (await response.json()) as {
        result?: FamilySession
        recoveryCode?: string
        error?: string
      }
      if (!response.ok) {
        const apiMessage = payload.error ?? ''
        const needsRlsFix =
          apiMessage.toLowerCase().includes('row-level security') ||
          apiMessage.toLowerCase().includes('permission denied')
        return {
          result: null,
          error: new Error(needsRlsFix ? RLS_SETUP_HINT : apiMessage || 'Verbindung fehlgeschlagen.'),
        }
      }
      if (!payload.result || !payload.recoveryCode) {
        return { result: null, error: new Error('Familie konnte nicht verbunden werden.') }
      }
      return {
        result: { session: payload.result, recoveryCode: payload.recoveryCode },
        error: null,
      }
    } catch {
      return { result: null, error: new Error('Verbindung fehlgeschlagen.') }
    }
  })
}

export async function fetchFamilyByInviteCode(
  inviteCode: string,
): Promise<{ family: Family | null; error: Error | null }> {
  const code = inviteCode.trim()
  if (!code) return { family: null, error: new Error('Code fehlt.') }

  return withSupabaseRlsContextAsync({ inviteCode: code }, async () => {
    const { data, error } = await supabase
      .from('families')
      .select('*')
      .ilike('invite_code', code)
      .maybeSingle()

    if (error) return { family: null, error: new Error(error.message) }
    if (!data) return { family: null, error: null }
    return { family: mapFamilyRow(data as Record<string, unknown>), error: null }
  })
}
