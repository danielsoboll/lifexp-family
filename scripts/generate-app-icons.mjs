#!/usr/bin/env node
/**
 * App-Icons aus Avatar-Park-Bildern (Mitte 60 %, je 20 % Rand abgeschnitten).
 *
 *   npm run generate:app-icons
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const avatarsDir = path.join(root, 'public', 'avatars')
const iconsDir = path.join(root, 'public', 'icons')

/** Anteil der Mitte (20 % pro Seite entfernt → 60 % Mitte). */
const CENTER_FRACTION = 0.6
const CENTER_OFFSET = (1 - CENTER_FRACTION) / 2

const SOURCES = {
  male: 'Avatar_1_level1_1_Park.webp',
  female: 'Avatar_2_level1_4_park.webp',
}

const SIZES = [180, 192, 512]

async function loadSharp() {
  const mod = await import('sharp')
  return mod.default
}

async function cropCenterToSquare(sharp, inputPath) {
  const image = sharp(inputPath)
  const { width, height } = await image.metadata()
  if (!width || !height) {
    throw new Error(`Keine Bildmaße: ${inputPath}`)
  }

  const cropW = Math.round(width * CENTER_FRACTION)
  const cropH = Math.round(height * CENTER_FRACTION)
  const left = Math.round(width * CENTER_OFFSET)
  const top = Math.round(height * CENTER_OFFSET)

  return image.extract({ left, top, width: cropW, height: cropH })
}

async function writeIcon(sharp, gender, size) {
  const sourcePath = path.join(avatarsDir, SOURCES[gender])
  const outPath = path.join(iconsDir, `app-${gender}-${size}.png`)
  const cropped = await cropCenterToSquare(sharp, sourcePath)
  await cropped
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9 })
    .toFile(outPath)
  return outPath
}

function publicIconBasename(gender, size) {
  return gender === 'female' ? `icon-female-${size}.png` : `icon-${size}.png`
}

function writeManifest(gender) {
  const icon192 = `/${publicIconBasename(gender, 192)}`
  const icon512 = `/${publicIconBasename(gender, 512)}`
  const manifest = {
    name: 'LifeXP',
    short_name: 'LifeXP',
    description: 'XP, Level und Bereiche – dein Fortschritt im Überblick.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      {
        src: icon192,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: icon512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: icon512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
  const outPath = path.join(root, 'public', `manifest-${gender}.webmanifest`)
  fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return outPath
}

async function main() {
  const sharp = await loadSharp()
  fs.mkdirSync(iconsDir, { recursive: true })

  for (const gender of ['male', 'female']) {
    for (const size of SIZES) {
      const out = await writeIcon(sharp, gender, size)
      console.log(`OK ${out}`)
      if (size === 180 || size === 192 || size === 512) {
        const publicOut = path.join(root, 'public', publicIconBasename(gender, size))
        fs.copyFileSync(out, publicOut)
        console.log(`OK ${publicOut}`)
      }
    }
    const manifestPath = writeManifest(gender)
    console.log(`OK ${manifestPath}`)
  }

  // iOS sucht oft /apple-touch-icon.png — Standard männlich; Client setzt weiblich bei Bedarf.
  fs.copyFileSync(
    path.join(root, 'public', 'icon-180.png'),
    path.join(root, 'public', 'apple-touch-icon.png'),
  )
  console.log('OK public/apple-touch-icon.png')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
