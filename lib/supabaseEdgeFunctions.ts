import { resolveSupabaseAnonKey, resolveSupabaseUrl } from './supabaseEnv'

type EdgeFunctionPayload = { error?: string }

/** Edge Functions serverseitig — nutzt Supabase-Secrets (Service Role, Stripe) ohne Vercel-Env. */
export async function invokeSupabaseEdgeFunction<T extends Record<string, unknown>>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const baseUrl = resolveSupabaseUrl().replace(/\/$/, '')
  const anonKey = resolveSupabaseAnonKey()
  const url = `${baseUrl}/functions/v1/${functionName}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  let payload: (T & EdgeFunctionPayload) | EdgeFunctionPayload = {}
  try {
    payload = (await response.json()) as T & EdgeFunctionPayload
  } catch {
    payload = {}
  }

  if (!response.ok) {
    throw new Error(
      payload.error ??
        `Supabase Edge Function „${functionName}“ fehlgeschlagen (${response.status}).`,
    )
  }

  if (payload.error) {
    throw new Error(payload.error)
  }

  return payload as T
}
