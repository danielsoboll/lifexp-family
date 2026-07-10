#!/usr/bin/env node
/**
 * Schreibt SUPABASE_SERVICE_ROLE_KEY in .env.local (nach `npx supabase login`).
 * Usage: node scripts/pull-supabase-service-role.mjs
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const PROJECT_REF = 'rethdsbfcwwvyynkmbjb'
const ENV_PATH = resolve(process.cwd(), '.env.local')

function parseKeys(stdout) {
  try {
    const json = JSON.parse(stdout)
    if (Array.isArray(json)) {
      const row = json.find((item) => item.name === 'service_role' || item.id === 'service_role')
      return row?.api_key ?? row?.key ?? null
    }
  } catch {
    /* fall through */
  }

  const match = stdout.match(/service_role[^\n]*\n[^\n]*?(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/)
  return match?.[1] ?? null
}

let raw
try {
  raw = execSync(`npx supabase projects api-keys --project-ref ${PROJECT_REF} -o json`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
} catch (error) {
  const stderr = error?.stderr?.toString?.() ?? ''
  console.error('Supabase CLI fehlgeschlagen. Einmal ausführen: npx supabase login')
  if (stderr) console.error(stderr.trim())
  process.exit(1)
}

const serviceRoleKey = parseKeys(raw)
if (!serviceRoleKey) {
  console.error('service_role Key nicht gefunden. Bitte manuell aus Dashboard → Settings → API kopieren.')
  process.exit(1)
}

const previous = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : ''
const line = `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`
const next = previous.includes('SUPABASE_SERVICE_ROLE_KEY=')
  ? previous.replace(/^SUPABASE_SERVICE_ROLE_KEY=.*$/m, line).replace(/^# SUPABASE_SERVICE_ROLE_KEY=.*$/m, line)
  : `${previous.trimEnd()}\n\n${line}\n`

writeFileSync(ENV_PATH, next.endsWith('\n') ? next : `${next}\n`, 'utf8')
console.log('SUPABASE_SERVICE_ROLE_KEY in .env.local gesetzt.')
