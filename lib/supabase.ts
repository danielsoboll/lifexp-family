import { createClient } from '@supabase/supabase-js'

/** Projekt-URL (ohne `/rest/v1/` — der Client hängt die REST-Pfade selbst an). */
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://rethdsbfcwwvyynkmbjb.supabase.co'

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_TOEljSaQMk7hp6DoOV_QcA_kZ4iZMSf'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
