import type { SupabaseClient } from '@supabase/supabase-js'

import { familyDbError } from './dbError'
import {
  isMemberClaimable,
  type ClaimableMember,
  type ClaimMemberInput,
} from './claimableMembers'
import { normalizeChildGender, normalizeParentGender } from './memberGender'
import {
  generateUniqueMemberRecoveryCode,
  memberRecoveryInsertFields,
} from './memberRecoveryCode'
import {
  portraitIdFromStored,
  resolveChildAvatar,
  resolveParentAvatar,
} from './memberAvatar'
import type { FamilyOnboardingResult, OnboardingDevicePrefs } from './onboardingMember'

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

export async function fetchClaimableMembersDirect(
  client: SupabaseClient,
  inviteCode: string,
): Promise<{ members: ClaimableMember[]; error: Error | null }> {
  const { familyId, error: familyError } = await resolveFamilyIdByInviteCode(client, inviteCode)
  if (familyError || !familyId) return { members: [], error: familyError }

  const [{ data: parentRows, error: parentError }, { data: childRows, error: childError }] =
    await Promise.all([
      client
        .from('family_members')
        .select('parent_id, role, parent_profiles(id, display_name, gender, avatar_url, app_installed, rec_code_ok)')
        .eq('family_id', familyId)
        .neq('role', 'owner'),
      client
        .from('child_profiles')
        .select('id, display_name, gender, age, avatar_key, app_installed, rec_code_ok, is_active')
        .eq('family_id', familyId)
        .eq('is_active', true),
    ])

  if (parentError) return { members: [], error: new Error(parentError.message) }
  if (childError) return { members: [], error: new Error(childError.message) }

  const members: ClaimableMember[] = []

  for (const row of parentRows ?? []) {
    const rawProfile = row.parent_profiles
    const profile = (Array.isArray(rawProfile) ? rawProfile[0] : rawProfile) as Record<string, unknown> | null
    if (!profile || typeof row.parent_id !== 'string') continue
    if (
      !isMemberClaimable({
        app_installed: profile.app_installed === true,
        rec_code_ok: profile.rec_code_ok === true,
      })
    ) {
      continue
    }

    const gender = normalizeParentGender(profile.gender)
    const avatar = resolveParentAvatar(gender, profile.avatar_url as string | null)
    members.push({
      memberKind: 'parent',
      memberId: row.parent_id,
      displayName: String(profile.display_name ?? '').trim(),
      gender,
      avatarSrc: avatar.src,
      avatarError: avatar.error,
    })
  }

  for (const row of childRows ?? []) {
    if (
      !isMemberClaimable({
        app_installed: row.app_installed === true,
        rec_code_ok: row.rec_code_ok === true,
      })
    ) {
      continue
    }

    const gender = normalizeChildGender(row.gender)
    const age = typeof row.age === 'number' ? row.age : null
    const portraitId = portraitIdFromStored(row.avatar_key as string | null)
    const avatar = resolveChildAvatar(gender, age, portraitId)
    members.push({
      memberKind: 'child',
      memberId: String(row.id),
      displayName: String(row.display_name ?? '').trim(),
      gender,
      avatarSrc: avatar.src,
      avatarError: avatar.error,
    })
  }

  members.sort((a, b) => a.displayName.localeCompare(b.displayName, 'de'))

  return { members, error: null }
}

export async function claimFamilyMemberDirect(
  client: SupabaseClient,
  inviteCode: string,
  claim: ClaimMemberInput,
  devicePrefs?: OnboardingDevicePrefs,
): Promise<{ result: FamilyOnboardingResult | null; error: Error | null }> {
  const { familyId, error: familyError } = await resolveFamilyIdByInviteCode(client, inviteCode)
  if (familyError || !familyId) return { result: null, error: familyError }

  const prefs = {
    appInstalled: true,
    appLater: devicePrefs?.appLater ?? false,
  }

  if (claim.memberKind === 'parent') {
    const { data: memberRow, error: memberError } = await client
      .from('family_members')
      .select('parent_id, role')
      .eq('family_id', familyId)
      .eq('parent_id', claim.memberId)
      .neq('role', 'owner')
      .maybeSingle()

    if (memberError) return { result: null, error: new Error(memberError.message) }
    if (!memberRow?.parent_id) {
      return { result: null, error: new Error('Dieses Familienmitglied ist nicht verfügbar.') }
    }

    const { data: parentRow, error: parentError } = await client
      .from('parent_profiles')
      .select('id, display_name, app_installed, rec_code_ok, rec_code')
      .eq('id', claim.memberId)
      .maybeSingle()

    if (parentError) return { result: null, error: new Error(parentError.message) }
    if (!parentRow?.id || !parentRow.display_name) {
      return { result: null, error: new Error('Profil nicht gefunden.') }
    }
    if (
      !isMemberClaimable({
        app_installed: parentRow.app_installed === true,
        rec_code_ok: parentRow.rec_code_ok === true,
      })
    ) {
      return { result: null, error: new Error('Dieses Profil ist bereits mit einem Gerät verbunden.') }
    }

    let recoveryCode =
      typeof parentRow.rec_code === 'string' && parentRow.rec_code.trim()
        ? parentRow.rec_code.trim()
        : null
    if (!recoveryCode) {
      try {
        recoveryCode = await generateUniqueMemberRecoveryCode(client)
      } catch (error) {
        return {
          result: null,
          error: error instanceof Error ? error : new Error('Recovery-Code fehlgeschlagen.'),
        }
      }
    }

    const { data: updated, error: updateError } = await client
      .from('parent_profiles')
      .update(memberRecoveryInsertFields(recoveryCode, prefs))
      .eq('id', claim.memberId)
      .eq('app_installed', false)
      .eq('rec_code_ok', false)
      .select('id')
      .maybeSingle()

    if (updateError) return { result: null, error: familyDbError(updateError.message) }
    if (!updated?.id) {
      return { result: null, error: new Error('Dieses Profil ist bereits mit einem Gerät verbunden.') }
    }

    return {
      result: {
        session: { familyId, memberKind: 'parent', memberId: claim.memberId },
        recoveryCode,
      },
      error: null,
    }
  }

  const { data: childRow, error: childError } = await client
    .from('child_profiles')
    .select('id, display_name, app_installed, rec_code_ok, rec_code, family_id, is_active')
    .eq('id', claim.memberId)
    .eq('family_id', familyId)
    .eq('is_active', true)
    .maybeSingle()

  if (childError) return { result: null, error: new Error(childError.message) }
  if (!childRow?.id || !childRow.display_name) {
    return { result: null, error: new Error('Profil nicht gefunden.') }
  }
  if (
    !isMemberClaimable({
      app_installed: childRow.app_installed === true,
      rec_code_ok: childRow.rec_code_ok === true,
    })
  ) {
    return { result: null, error: new Error('Dieses Profil ist bereits mit einem Gerät verbunden.') }
  }

  let recoveryCode =
    typeof childRow.rec_code === 'string' && childRow.rec_code.trim() ? childRow.rec_code.trim() : null
  if (!recoveryCode) {
    try {
      recoveryCode = await generateUniqueMemberRecoveryCode(client)
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error : new Error('Recovery-Code fehlgeschlagen.'),
      }
    }
  }

  const { data: updated, error: updateError } = await client
    .from('child_profiles')
    .update(memberRecoveryInsertFields(recoveryCode, prefs))
    .eq('id', claim.memberId)
    .eq('app_installed', false)
    .eq('rec_code_ok', false)
    .select('id')
    .maybeSingle()

  if (updateError) return { result: null, error: familyDbError(updateError.message) }
  if (!updated?.id) {
    return { result: null, error: new Error('Dieses Profil ist bereits mit einem Gerät verbunden.') }
  }

  return {
    result: {
      session: { familyId, memberKind: 'child', memberId: claim.memberId },
      recoveryCode,
    },
    error: null,
  }
}
