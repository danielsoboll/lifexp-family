/**
 * Stems unter /public/avatars/ (ohne Endung). Legacy .svg / .png → .webp.
 * Bei neuen Dateinamen hier und in lib/avatarLibrary.ts ergänzen.
 */
const AVATAR_PUBLIC_STEMS = [
  'icon-192',
  'icon-512',
  'Avatar_1_level1',
  'Avatar_1_level1_1_Park',
  'Avatar_1_level1_2',
  'Avatar_1_level1_3',
  'Avatar_1_level2',
  'Avatar_1_level3',
  'Avatar_1_level4',
  'Avatar_2_level1',
  'Avatar_2_level1_2',
  'Avatar_2_level1_3',
  'Avatar_2_level1_4_park',
  'Together',
  'Together_after',
]

/** @type {import('next').NextConfig} */
module.exports = {
  allowedDevOrigins: ['192.168.178.83'],
  devIndicators: false,

  async redirects() {
    const avatarLegacy = AVATAR_PUBLIC_STEMS.flatMap((stem) => [
      {
        source: `/avatars/${stem}.svg`,
        destination: `/avatars/${stem}.webp`,
        permanent: false,
      },
      {
        source: `/avatars/${stem}.png`,
        destination: `/avatars/${stem}.webp`,
        permanent: false,
      },
    ])
    return avatarLegacy
  },

  async headers() {
    return [
      {
        source: '/avatars/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
}
