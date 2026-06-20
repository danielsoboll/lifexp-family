import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let adminClient: SupabaseClient | null | undefined

/** Service-Role-Client — nur serverseitig (umgeht RLS). */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey?.trim()) {
    adminClient = null
    return null
  }

  adminClient = createClient(url, serviceKey.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return adminClient
}
