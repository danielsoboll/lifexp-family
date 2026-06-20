import type { SupabaseClient } from '@supabase/supabase-js'

import type { FamilySession } from '../familySession'
import { newId } from '../newId'
import { familyDbError } from './dbError'
import { generateInviteCode } from './inviteCode'
import { defaultCanAdminForParent } from './memberAdmin'
import {
  defaultPortraitForCategory,
  memberAvatarCategoryForChild,
  memberAvatarCategoryForParent,
  portraitSrc,
} from './memberAvatar'
import type { OnboardingMemberProfile } from './onboardingMember'

async function createFamilyAsParentDirect(
  client: SupabaseClient,
  familyName: string,
  inviteCode: string,
  profile: Extract<OnboardingMemberProfile, { memberKind: 'parent' }>,
): Promise<{ result: FamilySession | null; error: Error | null }> {
  const parentId = newId()
  const familyId = newId()

  const ownerPortrait = defaultPortraitForCategory(memberAvatarCategoryForParent(profile.gender))

  const { error: parentError } = await client.from('parent_profiles').insert({
    id: parentId,
    display_name: profile.displayName,
    gender: profile.gender,
    can_admin: defaultCanAdminForParent(profile.gender),
    avatar_url: ownerPortrait ? portraitSrc(ownerPortrait) : null,
  })

  if (parentError) return { result: null, error: familyDbError(parentError.message) }

  const { error: familyError } = await client.from('families').insert({
    id: familyId,
    name: familyName.trim(),
    invite_code: inviteCode,
  })

  if (familyError) return { result: null, error: familyDbError(familyError.message) }

  const { error: memberError } = await client.from('family_members').insert({
    id: newId(),
    family_id: familyId,
    parent_id: parentId,
    role: 'owner',
  })

  if (memberError) return { result: null, error: familyDbError(memberError.message) }

  return {
    result: { familyId, memberKind: 'parent', memberId: parentId },
    error: null,
  }
}

async function createFamilyAsChildDirect(
  client: SupabaseClient,
  familyName: string,
  inviteCode: string,
  profile: Extract<OnboardingMemberProfile, { memberKind: 'child' }>,
): Promise<{ result: FamilySession | null; error: Error | null }> {
  const familyId = newId()
  const childId = newId()

  const { error: familyError } = await client.from('families').insert({
    id: familyId,
    name: familyName.trim(),
    invite_code: inviteCode,
  })

  if (familyError) return { result: null, error: familyDbError(familyError.message) }

  const creatorCategory = memberAvatarCategoryForChild(profile.gender, profile.age)
  const creatorPortrait = defaultPortraitForCategory(creatorCategory)

  const { error: childError } = await client.from('child_profiles').insert({
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

  return {
    result: { familyId, memberKind: 'child', memberId: childId },
    error: null,
  }
}

export async function createFamilyWithMemberDirect(
  client: SupabaseClient,
  familyName: string,
  profile: OnboardingMemberProfile,
): Promise<{ result: FamilySession | null; error: Error | null }> {
  const name = familyName.trim()
  if (!name) return { result: null, error: new Error('Bitte einen Familiennamen eingeben.') }

  const inviteCode = generateInviteCode()

  if (profile.memberKind === 'parent') {
    return createFamilyAsParentDirect(client, name, inviteCode, profile)
  }
  return createFamilyAsChildDirect(client, name, inviteCode, profile)
}
