#!/usr/bin/env node
/**
 * Konvertiert JPEG/PNG in /public/avatars/ nach WebP und löscht die Quelldateien.
 */
import { readdir, unlink } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const AVATARS_DIR = path.join(process.cwd(), 'public', 'avatars')
const SOURCE_EXT = new Set(['.jpg', '.jpeg', '.png'])

async function main() {
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

  console.log(converted > 0 ? `Fertig: ${converted} Datei(en) konvertiert.` : 'Keine JPEG/PNG zum Konvertieren.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
