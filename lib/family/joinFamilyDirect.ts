import type { SupabaseClient } from '@supabase/supabase-js'

import { newId } from '../newId'
import { familyDbError } from './dbError'
import { defaultCanAdminForChild, defaultCanAdminForParent } from './memberAdmin'
import {
  childPortraitKeyForOnboarding,
  parentAvatarUrlForOnboarding,
} from './onboardingMember'
import { nextAccentKeyForFamily } from './memberAccentAssign'
import {
  generateUniqueMemberRecoveryCode,
  memberRecoveryInsertFields,
} from './memberRecoveryCode'
import type {
  FamilyOnboardingResult,
  OnboardingDevicePrefs,
  OnboardingMemberProfile,
} from './onboardingMember'

async function resolveFamilyIdByInviteCode(
  client: SupabaseClient,
  inviteCode: string,
): Promise<{ familyId: string | null; error: Error | null }> {
  const code = inviteCode.trim()
  if (!code) return { familyId: null, error: new Error('Bitte einen Einladungscode eingeben.') }

  const { data: familyRow, error: familyError } = await client
    .from('families')
    .select('id')
    .ilike('invite_code', code)
    .maybeSingle()

  if (familyError) return { familyId: null, error: new Error(familyError.message) }
  if (!familyRow?.id) return { familyId: null, error: new Error('Einladungscode ungültig.') }
  return { familyId: familyRow.id as string, error: null }
}

async function joinFamilyAsParentDirect(
  client: SupabaseClient,
  familyId: string,
  profile: Extract<OnboardingMemberProfile, { memberKind: 'parent' }>,
  devicePrefs?: OnboardingDevicePrefs,
): Promise<{ result: FamilyOnboardingResult | null; error: Error | null }> {
  const parentId = newId()
  const recoveryCode = await generateUniqueMemberRecoveryCode(client)

  const parentPortraitUrl = parentAvatarUrlForOnboarding(profile)
  const { accentKey, error: accentError } = await nextAccentKeyForFamily(familyId)
  if (accentError) return { result: null, error: accentError }

  const { error: parentError } = await client.from('parent_profiles').insert({
    id: parentId,
    display_name: profile.displayName,
    gender: profile.gender,
    can_admin: defaultCanAdminForParent(profile.gender),
    avatar_url: parentPortraitUrl,
    accent_key: accentKey,
    ...memberRecoveryInsertFields(recoveryCode, devicePrefs),
  })

  if (parentError) return { result: null, error: familyDbError(parentError.message) }

  const { error: memberError } = await client.from('family_members').insert({
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

async function joinFamilyAsChildDirect(
  client: SupabaseClient,
  familyId: string,
  profile: Extract<OnboardingMemberProfile, { memberKind: 'child' }>,
  devicePrefs?: OnboardingDevicePrefs,
): Promise<{ result: FamilyOnboardingResult | null; error: Error | null }> {
  const childId = newId()
  const recoveryCode = await generateUniqueMemberRecoveryCode(client)

  const { data: sortRows } = await client
    .from('child_profiles')
    .select('sort_order')
    .eq('family_id', familyId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sortOrder = (typeof sortRows?.[0]?.sort_order === 'number' ? sortRows[0].sort_order : 0) + 1

  const childPortrait = childPortraitKeyForOnboarding(profile)
  const { accentKey, error: accentError } = await nextAccentKeyForFamily(familyId)
  if (accentError) return { result: null, error: accentError }

  const { error: childError } = await client.from('child_profiles').insert({
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

  if (childError) return { result: null, error: familyDbError(childError.message) }

  return {
    result: {
      session: { familyId, memberKind: 'child', memberId: childId },
      recoveryCode,
    },
    error: null,
  }
}

export async function joinFamilyWithInviteCodeDirect(
  client: SupabaseClient,
  inviteCode: string,
  profile: OnboardingMemberProfile,
  devicePrefs?: OnboardingDevicePrefs,
): Promise<{ result: FamilyOnboardingResult | null; error: Error | null }> {
  const { familyId, error: familyError } = await resolveFamilyIdByInviteCode(client, inviteCode)
  if (familyError || !familyId) return { result: null, error: familyError }

  if (profile.memberKind === 'parent') {
    return joinFamilyAsParentDirect(client, familyId, profile, devicePrefs)
  }
  return joinFamilyAsChildDirect(client, familyId, profile, devicePrefs)
}
