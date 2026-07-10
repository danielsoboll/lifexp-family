#!/usr/bin/env node
/**
 * Findet die Live-Price-ID (4,99 €/Monat) und setzt STRIPE_PRICE_ID in Supabase.
 * Usage: STRIPE_SECRET_KEY=sk_live_... npm run setup:stripe-price
 */

import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const PROJECT_REF = 'rethdsbfcwwvyynkmbjb'
const ENV_PATH = resolve(process.cwd(), '.env.local')

function loadEnvLocal() {
  if (!existsSync(ENV_PATH)) return
  for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    if (process.env[key]) continue
    process.env[key] = trimmed.slice(eq + 1).trim()
  }
}

loadEnvLocal()

const secret = process.env.STRIPE_SECRET_KEY?.trim()
if (!secret?.startsWith('sk_live_')) {
  console.error('STRIPE_SECRET_KEY=sk_live_... fehlt (.env.local oder Shell).')
  process.exit(1)
}

const res = await fetch('https://api.stripe.com/v1/prices?active=true&limit=100&type=recurring', {
  headers: { Authorization: `Bearer ${secret}` },
})
const json = await res.json()
if (!res.ok) {
  console.error(json.error?.message ?? 'Stripe-Preise konnten nicht geladen werden.')
  process.exit(1)
}

const prices = (json.data ?? []).filter(
  (p) => p.currency === 'eur' && p.recurring?.interval === 'month' && p.unit_amount === 499,
)

if (prices.length === 0) {
  console.error('Kein Live-Preis 4,99 €/Monat gefunden. Bitte in Stripe Dashboard anlegen.')
  process.exit(1)
}

const priceId = prices[0].id
execSync(`npx supabase secrets set STRIPE_PRICE_ID=${priceId} --project-ref ${PROJECT_REF}`, {
  stdio: 'inherit',
})
console.log(`STRIPE_PRICE_ID gesetzt (${priceId}).`)
