#!/usr/bin/env node
/**
 * Optimiert WebP-Dateien unter public/avatars/ (sharp: max. Kantenlänge, Qualität).
 *
 *   npm run optimize:avatars
 *   node scripts/optimize-avatars.mjs --max-edge 1280 --webp-quality 85
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const avatarsDir = path.join(root, 'public', 'avatars')

const maxEdgeArg = process.argv.find((a) => a.startsWith('--max-edge='))
const webpQualityArg = process.argv.find((a) => a.startsWith('--webp-quality='))
const MAX_EDGE = maxEdgeArg ? Number(maxEdgeArg.split('=')[1]) : 1280
const WEBP_QUALITY = webpQualityArg ? Number(webpQualityArg.split('=')[1]) : 85

async function loadSharp() {
  try {
    const mod = await import('sharp')
    return mod.default
  } catch {
    return null
  }
}

function fileSizeMb(filePath) {
  return fs.statSync(filePath).size / (1024 * 1024)
}

async function optimizeWebp(sharp, filePath) {
  const before = fileSizeMb(filePath)
  const tmpPath = `${filePath}.tmp.webp`
  await sharp(filePath)
    .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toFile(tmpPath)
  fs.renameSync(tmpPath, filePath)
  const after = fileSizeMb(filePath)
  return { before, after }
}

async function main() {
  const sharp = await loadSharp()
  if (!sharp) {
    console.error('sharp fehlt. Bitte: npm install')
    process.exit(1)
  }

  const files = fs
    .readdirSync(avatarsDir)
    .filter((name) => name.endsWith('.webp'))
    .sort()

  if (files.length === 0) {
    console.log('Keine WebP-Dateien in public/avatars/')
    return
  }

  console.log(`Avatar-Optimierung: WebP max ${MAX_EDGE}px, Qualität ${WEBP_QUALITY}\n`)

  let saved = 0
  for (const name of files) {
    const filePath = path.join(avatarsDir, name)
    const { before, after } = await optimizeWebp(sharp, filePath)
    const delta = before - after
    saved += Math.max(0, delta)
    console.log(`WebP ${name}: ${before.toFixed(2)} MB → ${after.toFixed(2)} MB`)
  }

  console.log(`\nFertig. Gespart: ~${saved.toFixed(2)} MB`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
