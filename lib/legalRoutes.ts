export const PUBLIC_LEGAL_PATHS = ['/impressum', '/datenschutz', '/haftung'] as const

export type PublicLegalPath = (typeof PUBLIC_LEGAL_PATHS)[number]

export function isPublicLegalPath(pathname: string): pathname is PublicLegalPath {
  return (PUBLIC_LEGAL_PATHS as readonly string[]).includes(pathname)
}
