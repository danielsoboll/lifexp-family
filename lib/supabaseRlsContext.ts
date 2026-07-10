import { readFamilySession } from './familySession'

export type SupabaseRlsContext = {
  familyId?: string
  memberId?: string
  memberKind?: 'parent' | 'child'
  inviteCode?: string
  recoveryCode?: string
  onboarding?: 'create' | 'join'
}

let activeContext: SupabaseRlsContext | null = null

export function withSupabaseRlsContext<T>(context: SupabaseRlsContext, run: () => T): T {
  const previous = activeContext
  activeContext = { ...previous, ...context }
  try {
    return run()
  } finally {
    activeContext = previous
  }
}

export async function withSupabaseRlsContextAsync<T>(
  context: SupabaseRlsContext,
  run: () => Promise<T>,
): Promise<T> {
  const previous = activeContext
  activeContext = { ...previous, ...context }
  try {
    return await run()
  } finally {
    activeContext = previous
  }
}

/** Request-Header für PostgREST RLS (x-lifexp-*). */
export function buildSupabaseRlsHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const context = activeContext

  const session = readFamilySession()
  const familyId = context?.familyId ?? session?.familyId
  const memberId = context?.memberId ?? session?.memberId
  const memberKind = context?.memberKind ?? session?.memberKind

  if (familyId) headers['x-lifexp-family-id'] = familyId
  if (memberId) headers['x-lifexp-member-id'] = memberId
  if (memberKind) headers['x-lifexp-member-kind'] = memberKind

  if (context?.inviteCode?.trim()) {
    headers['x-lifexp-invite-code'] = context.inviteCode.trim()
  }
  if (context?.recoveryCode?.trim()) {
    headers['x-lifexp-recovery-code'] = context.recoveryCode.trim()
  }
  if (context?.onboarding) {
    headers['x-lifexp-onboarding'] = context.onboarding
  }

  return headers
}
