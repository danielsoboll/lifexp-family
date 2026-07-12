/** Eingebettete Projekt-Defaults — Build/Runtime funktionieren ohne Vercel NEXT_PUBLIC_* Variablen. */
export const DEFAULT_SUPABASE_URL = 'https://rethdsbfcwwvyynkmbjb.supabase.co'
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_TOEljSaQMk7hp6DoOV_QcA_kZ4iZMSf'

export function resolveSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL
}

export function resolveSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || DEFAULT_SUPABASE_ANON_KEY
}

export function resolveSupabaseServiceRoleKey(): string | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return key || null
}
