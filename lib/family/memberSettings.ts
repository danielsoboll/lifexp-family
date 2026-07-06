import { supabase } from '../supabase'
import type { FamilySessionMemberKind } from '../familySession'

function memberTable(memberKind: FamilySessionMemberKind): 'parent_profiles' | 'child_profiles' {
  return memberKind === 'parent' ? 'parent_profiles' : 'child_profiles'
}

function isMemberDeviceSettingsSchemaError(error: { message?: string; code?: string }): boolean {
  return Boolean(
    error.message?.includes('rec_code') ||
      error.message?.includes('app_installed') ||
      error.message?.includes('app_later') ||
      error.message?.includes('schema cache') ||
      error.code === 'PGRST205',
  )
}

async function updateMemberField(
  memberKind: FamilySessionMemberKind,
  memberId: string,
  patch: Record<string, unknown>,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from(memberTable(memberKind))
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', memberId)

  return { error: error ? new Error(error.message) : null }
}

export async function updateMemberAppInstalled(
  memberKind: FamilySessionMemberKind,
  memberId: string,
  installed: boolean,
): Promise<{ error: Error | null }> {
  return updateMemberField(memberKind, memberId, {
    app_installed: installed,
    ...(installed ? { app_later: false } : {}),
  })
}

export async function updateMemberAppLater(
  memberKind: FamilySessionMemberKind,
  memberId: string,
  later: boolean,
): Promise<{ error: Error | null }> {
  return updateMemberField(memberKind, memberId, { app_later: later })
}

export async function updateMemberRecCodeOk(
  memberKind: FamilySessionMemberKind,
  memberId: string,
  ok: boolean,
): Promise<{ error: Error | null }> {
  return updateMemberField(memberKind, memberId, { rec_code_ok: ok })
}

export async function fetchMemberDeviceSettings(
  memberKind: FamilySessionMemberKind,
  memberId: string,
): Promise<{
  appInstalled: boolean
  appLater: boolean
  recCode: string | null
  recCodeOk: boolean
  error: Error | null
}> {
  const { data, error } = await supabase
    .from(memberTable(memberKind))
    .select('app_installed, app_later, rec_code, rec_code_ok')
    .eq('id', memberId)
    .maybeSingle()

  if (error) {
    if (isMemberDeviceSettingsSchemaError(error)) {
      return {
        appInstalled: false,
        appLater: false,
        recCode: null,
        recCodeOk: true,
        error: null,
      }
    }
    return {
      appInstalled: false,
      appLater: false,
      recCode: null,
      recCodeOk: false,
      error: new Error(error.message),
    }
  }

  return {
    appInstalled: data?.app_installed === true,
    appLater: data?.app_later === true,
    recCode: typeof data?.rec_code === 'string' ? data.rec_code : null,
    recCodeOk: data?.rec_code_ok === true,
    error: null,
  }
}
