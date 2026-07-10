import { normalizeInviteCodeInput } from '../parseInviteCode'
import { FAMILY_SITE_ORIGIN, resolveFamilySiteOrigin } from './siteOrigin'

/** Kanonische Domain für teilbare Einladungslinks und QR-Codes. */
export const FAMILY_INVITE_ORIGIN = FAMILY_SITE_ORIGIN

/** Origin für Einladungslinks — auf family.life-xp.de immer die Hauptdomain (https, ohne www). */
export function resolveFamilyInviteOrigin(): string {
  return resolveFamilySiteOrigin()
}

export function buildFamilyInviteLink(inviteCode: string, origin?: string): string {
  const code = normalizeInviteCodeInput(inviteCode)
  if (!code) return ''

  const base = origin ?? resolveFamilyInviteOrigin()

  return `${base.replace(/\/$/, '')}/?code=${encodeURIComponent(code)}`
}

export function buildFamilyInviteShareText(input: {
  inviteCode: string
  familyName?: string | null
}): string {
  const code = normalizeInviteCodeInput(input.inviteCode)
  const name = input.familyName?.trim()
  if (name) {
    return `Komm zu „${name}“ bei LifeXP Family!\nEinladungscode: ${code}`
  }
  return `Komm zu unserer Familie bei LifeXP Family!\nEinladungscode: ${code}`
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* execCommand-Fallback */
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

export async function copyFamilyInviteCode(inviteCode: string): Promise<boolean> {
  const code = normalizeInviteCodeInput(inviteCode)
  if (!code) return false
  return copyText(code)
}

export async function copyFamilyInviteLink(inviteCode: string): Promise<boolean> {
  const url = buildFamilyInviteLink(inviteCode)
  if (!url) return false
  return copyText(url)
}

export async function shareFamilyInviteLink(input: {
  inviteCode: string
  familyName?: string | null
}): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  const url = buildFamilyInviteLink(input.inviteCode)
  if (!url) return 'failed'

  const text = buildFamilyInviteShareText(input)
  const shareData: ShareData = {
    title: 'LifeXP Family — Einladung',
    text,
    url,
  }

  if (canUseNativeShare()) {
    try {
      if (typeof navigator.canShare === 'function' && !navigator.canShare(shareData)) {
        await navigator.share({ url })
      } else {
        await navigator.share(shareData)
      }
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }

  const ok = await copyText(`${text}\n\n${url}`)
  return ok ? 'copied' : 'failed'
}
