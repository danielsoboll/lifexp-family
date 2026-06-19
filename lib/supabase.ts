import { createClient } from '@supabase/supabase-js'

/** Projekt-URL (ohne `/rest/v1/` — der Client hängt die REST-Pfade selbst an). */
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://rethdsbfcwwvyynkmbjb.supabase.co'

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_TOEljSaQMk7hp6DoOV_QcA_kZ4iZMSf'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'lifexp-family-auth',
  },
})

/** Stellt sicher, dass eine gültige Supabase-Session für RLS-Anfragen existiert. */
export async function requireSupabaseUserId(): Promise<{ userId: string; error: Error | null }> {
  const { data, error } = await supabase.auth.getUser()
  if (error) return { userId: '', error: new Error(error.message) }
  if (!data.user) return { userId: '', error: new Error('Nicht angemeldet.') }
  return { userId: data.user.id, error: null }
}
