import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { resolveSupabaseAnonKey, resolveSupabaseUrl } from './supabaseEnv'

export type ServerFamilySession = {
  familyId: string
  memberId: string
  memberKind: 'parent' | 'child'
}

export type ServerOnboardingContext = {
  mode: 'create' | 'join'
  inviteCode?: string
}

function createSupabaseServerClient(rlsHeaders: Record<string, string>): SupabaseClient {
  const url = resolveSupabaseUrl()
  const anonKey = resolveSupabaseAnonKey()

  return createClient(url, anonKey, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers ?? {})
        for (const [key, value] of Object.entries(rlsHeaders)) {
          if (value) headers.set(key, value)
        }
        return fetch(input, { ...init, headers })
      },
    },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

/** Server-Client mit x-lifexp-* Headern aus der Familien-Session (RLS). */
export function createSupabaseServerSessionClient(session: ServerFamilySession): SupabaseClient {
  return createSupabaseServerClient({
    'x-lifexp-family-id': session.familyId,
    'x-lifexp-member-id': session.memberId,
    'x-lifexp-member-kind': session.memberKind,
  })
}

/** Server-Client für Onboarding (Familie erstellen / beitreten) — RLS via x-lifexp-onboarding. */
export function createSupabaseServerOnboardingClient(context: ServerOnboardingContext): SupabaseClient {
  const headers: Record<string, string> = {
    'x-lifexp-onboarding': context.mode,
  }
  const inviteCode = context.inviteCode?.trim()
  if (inviteCode) {
    headers['x-lifexp-invite-code'] = inviteCode
  }
  return createSupabaseServerClient(headers)
}
