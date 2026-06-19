#!/usr/bin/env node
/**
 * profiles.goal_type: abnehmen → fit
 *
 *   node scripts/migrate-goal-type-abnehmen-to-fit.mjs
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://clkjvyxcbkexuzcwmwci.supabase.co'
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_kxwcVW9U9f59yN1ZNn9wxg_ukhJGOAs'

const supabase = createClient(supabaseUrl, supabaseKey)

const FROM = ['abnehmen', 'Abnehmen']

async function migrate() {
  const { data, error } = await supabase
    .from('profiles')
    .update({ goal_type: 'fit' })
    .in('goal_type', FROM)
    .select('username')

  if (error) {
    console.error('Fehler:', error.message)
    process.exit(1)
  }

  const count = data?.length ?? 0
  console.log(`Fertig. ${count} Profil(e) von abnehmen → fit aktualisiert.`)
}

migrate()
