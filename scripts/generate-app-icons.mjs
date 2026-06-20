#!/usr/bin/env node
/**
 * App-Icons aus Happy_all (Familien-Portrait).
 *
 *   npm run generate:app-icons
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const avatarsDir = path.join(root, 'public', 'avatars')
const iconsDir = path.join(root, 'public', 'icons')
const publicDir = path.join(root, 'public')

const SOURCE = 'Happy_all.webp'
const SIZES = [180, 192, 512]
const ICON_VERSION = 'happy-all-1'

const STALE_PUBLIC_ICON_FILES = [
  'manifest-male.webmanifest',
  'manifest-female.webmanifest',
  ...SIZES.flatMap((size) => [`icon-female-${size}.png`]),
]

const STALE_ICON_DIR_PATTERNS = [/^app-male-/, /^app-female-/]

async function loadSharp() {
  const mod = await import('sharp')
  return mod.default
}

/** Mittiges Quadrat — passt für Querformat-Portraits. */
async function cropCenterSquare(sharp, inputPath) {
  const image = sharp(inputPath)
  const { width, height } = await image.metadata()
  if (!width || !height) {
    throw new Error(`Keine Bildmaße: ${inputPath}`)
  }

  const side = Math.min(width, height)
  const left = Math.round((width - side) / 2)
  const top = Math.round((height - side) / 2)

  return image.extract({ left, top, width: side, height: side })
}

async function writeIcon(sharp, size) {
  const sourcePath = path.join(avatarsDir, SOURCE)
  const outPath = path.join(iconsDir, `app-happy-all-${size}.png`)
  const cropped = await cropCenterSquare(sharp, sourcePath)
  await cropped
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9 })
    .toFile(outPath)
  return outPath
}

function publicIconBasename(size) {
  return `icon-${size}.png`
}

function writeManifest() {
  const iconQuery = `?v=${ICON_VERSION}`
  const manifest = {
    name: 'LifeXP Family',
    short_name: 'LifeXP Family',
    description: 'Quests, XP und Belohnungen für die ganze Familie.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      {
        src: `/icon-180.png${iconQuery}`,
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `/icon-192.png${iconQuery}`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `/icon-512.png${iconQuery}`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `/icon-512.png${iconQuery}`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
  const outPath = path.join(publicDir, 'manifest.webmanifest')
  fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return outPath
}

function removeStaleIcons() {
  for (const file of STALE_PUBLIC_ICON_FILES) {
    const target = path.join(publicDir, file)
    if (fs.existsSync(target)) {
      fs.unlinkSync(target)
      console.log(`REMOVED ${target}`)
    }
  }

  if (fs.existsSync(iconsDir)) {
    for (const file of fs.readdirSync(iconsDir)) {
      if (STALE_ICON_DIR_PATTERNS.some((pattern) => pattern.test(file))) {
        const target = path.join(iconsDir, file)
        fs.unlinkSync(target)
        console.log(`REMOVED ${target}`)
      }
    }
  }
}

async function main() {
  const sharp = await loadSharp()
  fs.mkdirSync(iconsDir, { recursive: true })
  removeStaleIcons()

  for (const size of SIZES) {
    const out = await writeIcon(sharp, size)
    console.log(`OK ${out}`)
    const publicOut = path.join(publicDir, publicIconBasename(size))
    fs.copyFileSync(out, publicOut)
    console.log(`OK ${publicOut}`)
  }

  const manifestPath = writeManifest()
  console.log(`OK ${manifestPath}`)

  fs.copyFileSync(
    path.join(publicDir, 'icon-180.png'),
    path.join(publicDir, 'apple-touch-icon.png'),
  )
  console.log('OK public/apple-touch-icon.png')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
