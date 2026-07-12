import { createClient } from '@supabase/supabase-js'

import { buildSupabaseRlsHeaders } from './supabaseRlsContext'
import { resolveSupabaseAnonKey, resolveSupabaseUrl } from './supabaseEnv'

const supabaseUrl = resolveSupabaseUrl()
const supabaseAnonKey = resolveSupabaseAnonKey()

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

/** RLS-Header nur für PostgREST/Storage — Edge Functions (Stripe) erlauben sie in CORS nicht. */
function shouldAttachRlsHeaders(input: RequestInfo | URL): boolean {
  const url = requestUrl(input)
  return url.includes('/rest/v1/') || url.includes('/storage/v1/')
}

function supabaseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers ?? {})
  if (shouldAttachRlsHeaders(input)) {
    for (const [key, value] of Object.entries(buildSupabaseRlsHeaders())) {
      headers.set(key, value)
    }
  }
  return fetch(input, { ...init, headers })
}

/** Anonymer Client — Zugriff nur mit gültiger Familien-Session (RLS via x-lifexp-* Header). */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: supabaseFetch },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})
