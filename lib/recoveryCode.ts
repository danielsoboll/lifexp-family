/** Format: LIFE-XXXX-XXXX (Großbuchstaben + Ziffern, ohne 0/O/1/I). */
const RECOVERY_CODE_SEGMENT_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
export const RECOVERY_CODE_PATTERN = /^LIFE-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/

function randomSegment(length: number): string {
  const chars = RECOVERY_CODE_SEGMENT_CHARS
  const bytes = new Uint8Array(length)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  }
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += chars[bytes[i]! % chars.length]
  }
  return out
}

export function generateRecoveryCode(): string {
  return `LIFE-${randomSegment(4)}-${randomSegment(4)}`
}

export function normalizeRecoveryCodeInput(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

export function isValidRecoveryCodeFormat(code: string): boolean {
  return RECOVERY_CODE_PATTERN.test(normalizeRecoveryCodeInput(code))
}

export function formatRecoveryCodeDisplay(code: string): string {
  const normalized = normalizeRecoveryCodeInput(code)
  if (RECOVERY_CODE_PATTERN.test(normalized)) return normalized
  return code.trim()
}

export const RECOVERY_RESTORE_MAX_ATTEMPTS = 3
