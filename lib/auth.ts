import type { Session, User } from '@supabase/supabase-js'

import { supabase } from './supabase'

export type AuthSignUpInput = {
  email: string
  password: string
  displayName: string
}

export type AuthSignInInput = {
  email: string
  password: string
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)
  return data.session
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession()
  return session?.user ?? null
}

export async function signUp({ email, password, displayName }: AuthSignUpInput): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        display_name: displayName.trim(),
      },
    },
  })
  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('Registrierung fehlgeschlagen.')
  return data.user
}

export async function signIn({ email, password }: AuthSignInInput): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('Anmeldung fehlgeschlagen.')
  return data.user
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}
