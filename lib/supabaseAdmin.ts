import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { resolveSupabaseServiceRoleKey, resolveSupabaseUrl } from './supabaseEnv'

let adminClient: SupabaseClient | null | undefined

/** Service-Role-Client — nur serverseitig (umgeht RLS). URL hat Code-Fallback; Key nur aus Env. */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient

  const url = resolveSupabaseUrl()
  const serviceKey = resolveSupabaseServiceRoleKey()

  if (!serviceKey) {
    adminClient = null
    return null
  }

  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return adminClient
}
