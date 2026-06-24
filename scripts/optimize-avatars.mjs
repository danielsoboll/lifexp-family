#!/usr/bin/env node
/**
 * Konvertiert JPEG/PNG in /public/avatars/ nach WebP, löscht Quelldateien
 * und synchronisiert AVAILABLE_PORTRAIT_IDS in lib/family/memberAvatar.ts.
 */
import { readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const AVATARS_DIR = path.join(process.cwd(), 'public', 'avatars')
const MEMBER_AVATAR_PATH = path.join(process.cwd(), 'lib', 'family', 'memberAvatar.ts')
const SOURCE_EXT = new Set(['.jpg', '.jpeg', '.png'])
const PORTRAIT_ID_PATTERN = /^(Mann|Frau|Junge|Mädchen|Opa|Oma)_\d+_\d+t?$/
const EXTRA_PORTRAIT_IDS = new Set(['Mann_1_1b', 'Mann_2_1b', 'Frau_1_1b', 'Frau_2_1b'])
const FAMILY_ORDER = ['Frau', 'Oma', 'Junge', 'Mann', 'Opa', 'Mädchen']

function portraitSortKey(id) {
  const match = id.match(/^(Mann|Frau|Junge|Mädchen|Opa|Oma)_/)
  const family = match?.[1] ?? ''
  const familyIndex = FAMILY_ORDER.indexOf(family)
  return `${String(familyIndex).padStart(2, '0')}_${id}`
}

function normalizePortraitId(id) {
  return id.normalize('NFC')
}

function isPortraitFileId(id) {
  const normalized = normalizePortraitId(id)
  return PORTRAIT_ID_PATTERN.test(normalized) || EXTRA_PORTRAIT_IDS.has(normalized)
}

async function convertSources() {
  const files = await readdir(AVATARS_DIR)
  let converted = 0

  for (const file of files) {
    const ext = path.extname(file).toLowerCase()
    if (!SOURCE_EXT.has(ext)) continue

    const base = file.slice(0, -ext.length)
    const src = path.join(AVATARS_DIR, file)
    const dest = path.join(AVATARS_DIR, `${base}.webp`)

    await sharp(src).webp({ quality: 82, effort: 4 }).toFile(dest)
    await unlink(src)
    converted += 1
    console.log(`OK ${base}.webp`)
  }

  return converted
}

async function collectPortraitIds() {
  const files = await readdir(AVATARS_DIR)
  return files
    .filter((file) => file.endsWith('.webp'))
    .map((file) => normalizePortraitId(file.slice(0, -'.webp'.length)))
    .filter(isPortraitFileId)
    .sort((a, b) => portraitSortKey(a).localeCompare(portraitSortKey(b), 'de'))
}

async function syncAvailablePortraitIds(ids) {
  const source = await readFile(MEMBER_AVATAR_PATH, 'utf8')
  const block = ids.map((id) => `  '${id}',`).join('\n')
  const next = source.replace(
    /export const AVAILABLE_PORTRAIT_IDS = new Set<AvatarPortraitId>\(\[[\s\S]*?\]\)/,
    `export const AVAILABLE_PORTRAIT_IDS = new Set<AvatarPortraitId>([\n${block}\n])`,
  )

  if (next === source) {
    throw new Error('AVAILABLE_PORTRAIT_IDS konnte in memberAvatar.ts nicht aktualisiert werden.')
  }

  await writeFile(MEMBER_AVATAR_PATH, next)
  console.log(`Portrait-IDs synchronisiert (${ids.length} Dateien).`)
}

async function main() {
  const converted = await convertSources()
  const ids = await collectPortraitIds()
  await syncAvailablePortraitIds(ids)

  if (converted > 0) {
    console.log(`Fertig: ${converted} Datei(en) konvertiert.`)
  } else {
    console.log('Keine JPEG/PNG zum Konvertieren.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
