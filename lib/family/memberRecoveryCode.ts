import type { SupabaseClient } from '@supabase/supabase-js'

import { generateRecoveryCode, normalizeRecoveryCodeInput } from '../recoveryCode'
import type { OnboardingDevicePrefs } from './onboardingMember'

export type MemberRecoveryFields = {
  rec_code: string
  rec_code_ok: false
  app_installed: boolean
  app_later: boolean
}

export function memberRecoveryInsertFields(
  recoveryCode: string,
  prefs?: OnboardingDevicePrefs,
): MemberRecoveryFields {
  return {
    rec_code: recoveryCode,
    rec_code_ok: false,
    app_installed: prefs?.appInstalled ?? false,
    app_later: prefs?.appLater ?? false,
  }
}

async function isRecoveryCodeTaken(client: SupabaseClient, code: string): Promise<boolean> {
  const normalized = normalizeRecoveryCodeInput(code)
  const [parentResult, childResult] = await Promise.all([
    client.from('parent_profiles').select('id').eq('rec_code', normalized).maybeSingle(),
    client.from('child_profiles').select('id').eq('rec_code', normalized).maybeSingle(),
  ])

  if (parentResult.error) throw new Error(parentResult.error.message)
  if (childResult.error) throw new Error(childResult.error.message)
  return Boolean(parentResult.data?.id || childResult.data?.id)
}

export async function generateUniqueMemberRecoveryCode(client: SupabaseClient): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateRecoveryCode()
    const taken = await isRecoveryCodeTaken(client, code)
    if (!taken) return code
  }
  throw new Error('Recovery-Code konnte nicht erzeugt werden.')
}
