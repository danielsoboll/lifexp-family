import { normalizeRecoveryCodeInput, isValidRecoveryCodeFormat } from '../recoveryCode'
import { supabase } from '../supabase'
import { withSupabaseRlsContextAsync } from '../supabaseRlsContext'
import { clearFamilyOnboardingDraft } from './onboardingDraft'
import { bootstrapOnboardingBridge, flushOnboardingBridge } from './onboardingBridge'
import { clearPwaInstallLater } from '../pwaInstall'
import { storeFamilySession, type FamilySession, type FamilySessionMemberKind } from '../familySession'

export type RecoveredMember = {
  session: FamilySession
  memberKind: FamilySessionMemberKind
  displayName: string
}

function textValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export async function fetchMemberByRecoveryCode(code: string): Promise<{
  member: RecoveredMember | null
  error: Error | null
}> {
  const normalized = normalizeRecoveryCodeInput(code)
  if (!normalized) {
    return { member: null, error: new Error('Bitte einen Recovery-Code eingeben.') }
  }
  if (!isValidRecoveryCodeFormat(normalized)) {
    return {
      member: null,
      error: new Error('Bitte einen gültigen Recovery-Code eingeben (z. B. LIFE-7K3P-92XQ).'),
    }
  }

  return withSupabaseRlsContextAsync({ recoveryCode: normalized }, async () => {
  const { data: parentRow, error: parentError } = await supabase
    .from('parent_profiles')
    .select('id, display_name')
    .eq('rec_code', normalized)
    .maybeSingle()

  if (parentError) {
    return { member: null, error: new Error(parentError.message) }
  }

  if (parentRow && typeof parentRow === 'object') {
    const parentId = textValue((parentRow as Record<string, unknown>).id)
    const displayName = textValue((parentRow as Record<string, unknown>).display_name).trim()
    if (!parentId || !displayName) {
      return { member: null, error: new Error('Recovery-Code nicht gefunden.') }
    }

    const { data: memberRow, error: memberError } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('parent_id', parentId)
      .in('role', ['owner', 'parent'])
      .maybeSingle()

    if (memberError) {
      return { member: null, error: new Error(memberError.message) }
    }

    const familyId = textValue((memberRow as Record<string, unknown> | null)?.family_id)
    if (!familyId) {
      return { member: null, error: new Error('Recovery-Code nicht gefunden. Bitte prüfen und erneut versuchen.') }
    }

    return {
      member: {
        session: { familyId, memberKind: 'parent', memberId: parentId },
        memberKind: 'parent',
        displayName,
      },
      error: null,
    }
  }

  const { data: childRow, error: childError } = await supabase
    .from('child_profiles')
    .select('id, display_name, family_id, is_active')
    .eq('rec_code', normalized)
    .maybeSingle()

  if (childError) {
    return { member: null, error: new Error(childError.message) }
  }

  if (!childRow || typeof childRow !== 'object') {
    return { member: null, error: new Error('Recovery-Code nicht gefunden. Bitte prüfen und erneut versuchen.') }
  }

  const row = childRow as Record<string, unknown>
  const childId = textValue(row.id)
  const displayName = textValue(row.display_name).trim()
  const familyId = textValue(row.family_id)
  const isActive = row.is_active !== false

  if (!childId || !displayName || !familyId || !isActive) {
    return { member: null, error: new Error('Recovery-Code nicht gefunden. Bitte prüfen und erneut versuchen.') }
  }

  return {
    member: {
      session: { familyId, memberKind: 'child', memberId: childId },
      memberKind: 'child',
      displayName,
    },
    error: null,
  }
  })
}

/** Recovery-Code → lokale Familien-Session, Onboarding-Entwurf weg. */
export function applyMemberToLocalSession(session: FamilySession): void {
  clearFamilyOnboardingDraft()
  clearPwaInstallLater()
  storeFamilySession(session)
  bootstrapOnboardingBridge()
  flushOnboardingBridge()
}
