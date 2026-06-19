#!/usr/bin/env node
/**
 * Ergänzt fehlende nutrition_rules für alle Kombinationen aus
 * gender × goal_type × type_category (1–5).
 * Numerische Werte werden vom ersten vorhandenen Eintrag übernommen.
 *
 *   node scripts/seed-nutrition-rules.mjs
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://clkjvyxcbkexuzcwmwci.supabase.co'
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_kxwcVW9U9f59yN1ZNn9wxg_ukhJGOAs'

const supabase = createClient(supabaseUrl, supabaseKey)

const GENDERS = ['male', 'female', 'divers']
const GOAL_TYPES = ['fit', 'pump', 'structure', 'goal']
const TYPE_CATEGORIES = [1, 2, 3, 4, 5]

const VALUE_FIELDS = [
  'kcal_low',
  'xp_kcal_low',
  'kcal_min',
  'xp_kcal_min',
  'kcal_opt',
  'xp_kcal_opt',
  'kcal_high',
  'xp_kcal_high',
  'kcal_ext',
  'xp_kcal_ext',
  'prot_low',
  'xp_prot_low',
  'prot_min',
  'xp_prot_min',
  'prot_opt',
  'xp_prot_opt',
  'prot_ext',
  'xp_prot_ext',
  'plus_bew1',
  'xp_high_plus',
  'xp_prot_plus',
]

function ruleKey(row) {
  return `${String(row.gender).trim().toLowerCase()}|${String(row.goal_type).trim().toLowerCase()}|${Number(row.type_category)}`
}

function pickTemplate(rows) {
  if (!rows?.length) return null
  return rows[0]
}

async function main() {
  const { data: existing, error: loadError } = await supabase.from('nutrition_rules').select('*')

  if (loadError) {
    console.error('Laden fehlgeschlagen:', loadError.message)
    process.exit(1)
  }

  const template = pickTemplate(existing)
  if (!template) {
    console.error('Kein Vorlagen-Eintrag in nutrition_rules gefunden.')
    process.exit(1)
  }

  console.log(
    `Vorlage: gender=${template.gender}, goal_type=${template.goal_type}, type_category=${template.type_category}`,
  )

  const values = Object.fromEntries(VALUE_FIELDS.map((field) => [field, template[field]]))
  const existingKeys = new Set((existing ?? []).map(ruleKey))

  const toInsert = []
  for (const gender of GENDERS) {
    for (const goal_type of GOAL_TYPES) {
      for (const type_category of TYPE_CATEGORIES) {
        const key = `${gender}|${goal_type}|${type_category}`
        if (existingKeys.has(key)) continue
        toInsert.push({ gender, goal_type, type_category, ...values })
      }
    }
  }

  if (toInsert.length === 0) {
    console.log('Alle Kombinationen sind bereits vorhanden.')
    return
  }

  console.log(`Füge ${toInsert.length} fehlende Einträge ein …`)

  const batchSize = 25
  for (let index = 0; index < toInsert.length; index += batchSize) {
    const batch = toInsert.slice(index, index + batchSize)
    const { error: insertError } = await supabase.from('nutrition_rules').insert(batch)
    if (insertError) {
      console.error('Insert fehlgeschlagen:', insertError.message)
      process.exit(1)
    }
    console.log(`  ${Math.min(index + batch.length, toInsert.length)} / ${toInsert.length}`)
  }

  const { count, error: countError } = await supabase
    .from('nutrition_rules')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('Zählen fehlgeschlagen:', countError.message)
    process.exit(1)
  }

  console.log(`Fertig. nutrition_rules enthält jetzt ${count} Einträge (Ziel: ${GENDERS.length * GOAL_TYPES.length * TYPE_CATEGORIES.length}).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
