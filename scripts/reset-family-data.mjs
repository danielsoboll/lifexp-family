#!/usr/bin/env node
/** Alle Family-Tabellen leeren (nutzt Anon-Key + MVP-RLS). */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error('Fehlt NEXT_PUBLIC_SUPABASE_URL oder NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, anonKey, { auth: { persistSession: false } })

const TABLES = [
  'family_challenge_progress',
  'reward_redemptions',
  'daily_xp_entries',
  'quest_completions',
  'family_challenges',
  'rewards',
  'quests',
  'child_profiles',
  'family_members',
  'families',
  'parent_profiles',
]

async function clearTable(table) {
  const { error, count } = await supabase.from(table).delete({ count: 'exact' }).neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw new Error(`${table}: ${error.message}`)
  return count ?? 0
}

async function main() {
  for (const table of TABLES) {
    const n = await clearTable(table)
    console.log(`OK ${table} (${n} Zeilen)`)
  }
  console.log('Fertig — alle Tabellen geleert.')
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
