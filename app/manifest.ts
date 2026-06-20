import type { MetadataRoute } from 'next'

import { APP_ICON_VERSION } from '../lib/appIcon'

export default function manifest(): MetadataRoute.Manifest {
  const iconQuery = `?v=${APP_ICON_VERSION}`

  return {
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
}
