const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomPart(length: number): string {
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)]
  }
  return out
}

export function generateInviteCode(): string {
  return `${randomPart(4)}-${randomPart(4)}`
}
