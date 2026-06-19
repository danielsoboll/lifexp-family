#!/usr/bin/env node
/**
 * Setzt meal_entries.meal_type auf Englisch (breakfast | lunch | …).
 * Nutzt dieselbe Logik wie supabase/meal_entries_meal_type_en.sql.
 *
 *   node scripts/migrate-meal-entries-meal-type.mjs
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://clkjvyxcbkexuzcwmwci.supabase.co'
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_kxwcVW9U9f59yN1ZNn9wxg_ukhJGOAs'

const supabase = createClient(supabaseUrl, supabaseKey)

const MIGRATIONS = [
  { to: 'breakfast', from: ['Frühstück', 'frühstück', 'fruhstuck', 'fruestueck', 'breakfast'] },
  { to: 'lunch', from: ['Mittagessen', 'mittagessen', 'mittag', 'lunch'] },
  { to: 'dinner', from: ['Abendessen', 'abendessen', 'abend', 'dinner'] },
  { to: 'snack', from: ['Snack', 'snack'] },
  { to: 'alcohol', from: ['alcohol', 'alkohol', 'Alkohol'] },
]

async function migrate() {
  let total = 0
  for (const { to, from } of MIGRATIONS) {
    const unique = [...new Set(from)]
    const { data, error } = await supabase
      .from('meal_entries')
      .update({ meal_type: to })
      .in('meal_type', unique)
      .select('id')

    if (error) {
      console.error(`Fehler bei Ziel "${to}":`, error.message)
      process.exit(1)
    }
    const count = data?.length ?? 0
    total += count
    if (count > 0) console.log(`${to}: ${count} Zeile(n) aktualisiert`)
  }
  console.log(`Fertig. ${total} Einträge insgesamt angepasst.`)
}

migrate()
