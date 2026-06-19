export const PUBLIC_LEGAL_PATHS = ['/impressum', '/datenschutz', '/haftung'] as const
export const PUBLIC_AUTH_PATHS = ['/login', '/signup'] as const

export type PublicLegalPath = (typeof PUBLIC_LEGAL_PATHS)[number]
export type PublicAuthPath = (typeof PUBLIC_AUTH_PATHS)[number]

const FAMILY_SETUP_PATH = '/family/setup'

export function isPublicLegalPath(pathname: string): pathname is PublicLegalPath {
  return (PUBLIC_LEGAL_PATHS as readonly string[]).includes(pathname)
}

export function isPublicAuthPath(pathname: string): pathname is PublicAuthPath {
  return (PUBLIC_AUTH_PATHS as readonly string[]).includes(pathname)
}

export function isFamilySetupPath(pathname: string): boolean {
  return pathname === FAMILY_SETUP_PATH
}

export function isPublicPath(pathname: string): boolean {
  return isPublicLegalPath(pathname) || isPublicAuthPath(pathname)
}

export { FAMILY_SETUP_PATH }
