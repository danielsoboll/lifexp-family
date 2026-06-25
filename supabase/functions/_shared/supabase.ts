import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    throw new Error('Supabase service configuration missing')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function getUserClient(authHeader: string): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anonKey) {
    throw new Error('Supabase configuration missing')
  }
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function requireAuthUser(req: Request): Promise<{ user: User; authHeader: string }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Response(JSON.stringify({ error: 'Nicht angemeldet.' }), { status: 401 })
  }

  const userClient = getUserClient(authHeader)
  const { data, error } = await userClient.auth.getUser()
  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: 'Sitzung ungültig.' }), { status: 401 })
  }

  return { user: data.user, authHeader }
}
