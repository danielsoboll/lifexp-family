export const PUBLIC_LEGAL_PATHS = ['/impressum', '/datenschutz', '/haftung'] as const

export type PublicLegalPath = (typeof PUBLIC_LEGAL_PATHS)[number]

const HOME_PATH = '/'

export function isPublicLegalPath(pathname: string): pathname is PublicLegalPath {
  return (PUBLIC_LEGAL_PATHS as readonly string[]).includes(pathname)
}

export function isWelcomePath(pathname: string): boolean {
  return pathname === HOME_PATH
}

export function isPublicPath(pathname: string): boolean {
  return isPublicLegalPath(pathname) || isWelcomePath(pathname)
}

export { HOME_PATH }
