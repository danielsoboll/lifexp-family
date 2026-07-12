#!/usr/bin/env node
/**
 * Löscht alle Family-Daten in Supabase (Service Role, umgeht RLS).
 * Usage: node scripts/wipe-all-family-data.mjs
 */

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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey?.trim()) {
  console.error('Fehlt NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey.trim(), {
  auth: { persistSession: false, autoRefreshToken: false },
})

/** Reihenfolge wegen Foreign Keys (Kinder zuerst). */
const TABLES = [
  'quest_completion_creator_reactions',
  'quest_completion_assignee_photos',
  'quest_assignments',
  'reward_redemptions',
  'member_personal_goal_tracking',
  'member_personal_goals',
  'family_personal_goal_tracking',
  'family_personal_goals',
  'member_xp_goal_daily_progress',
  'member_xp_goal_periods',
  'family_xp_goal_periods',
  'member_daily_xp_history',
  'family_daily_xp_history',
  'family_challenge_progress',
  'quest_completions',
  'daily_xp_entries',
  'recurring_quest_template_assignments',
  'recurring_quest_templates',
  'family_challenges',
  'rewards',
  'quests',
  'child_profiles',
  'family_members',
  'families',
  'parent_profiles',
]

const PHOTOS_BUCKET = 'quest-completion-photos'

async function clearTable(table) {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('does not exist')) {
      console.log(`SKIP ${table} (Tabelle fehlt)`)
      return 0
    }
    throw new Error(`${table}: ${error.message}`)
  }
  return count ?? 0
}

async function clearStorageBucket() {
  const { data: topLevel, error: listError } = await supabase.storage.from(PHOTOS_BUCKET).list('', { limit: 1000 })
  if (listError) {
    if (listError.message?.includes('not found') || listError.message?.includes('Bucket')) {
      console.log(`SKIP storage:${PHOTOS_BUCKET} (Bucket fehlt)`)
      return 0
    }
    throw new Error(`storage list: ${listError.message}`)
  }

  let removed = 0
  for (const folder of topLevel ?? []) {
    const familyPrefix = folder.name
    const { data: completions } = await supabase.storage.from(PHOTOS_BUCKET).list(familyPrefix, { limit: 1000 })
    for (const completion of completions ?? []) {
      const completionPrefix = `${familyPrefix}/${completion.name}`
      const { data: files } = await supabase.storage.from(PHOTOS_BUCKET).list(completionPrefix, { limit: 1000 })
      const paths = (files ?? []).map((file) => `${completionPrefix}/${file.name}`)
      if (paths.length > 0) {
        const { error } = await supabase.storage.from(PHOTOS_BUCKET).remove(paths)
        if (error) throw new Error(`storage remove: ${error.message}`)
        removed += paths.length
      }
    }
  }
  return removed
}

async function main() {
  console.log('Lösche alle Family-Daten …')

  const storageRemoved = await clearStorageBucket()
  console.log(`OK storage:${PHOTOS_BUCKET} (${storageRemoved} Dateien)`)

  for (const table of TABLES) {
    const n = await clearTable(table)
    console.log(`OK ${table} (${n} Zeilen)`)
  }

  console.log('Fertig — alle Familien und zugehörigen Daten gelöscht.')
  console.log('Hinweis: Browser-Cookies/localStorage lokal mit Hard-Reload oder Inkognito testen.')
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
