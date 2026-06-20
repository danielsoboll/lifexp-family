/** Extrahiert einen Einladungscode aus QR-Inhalt oder manueller Eingabe. */
export function parseInviteCodeFromQr(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const prefixed = trimmed.match(/^lifexp-family:(.+)$/i)
  if (prefixed?.[1]) return prefixed[1].trim()

  try {
    const url = new URL(trimmed)
    const fromQuery = url.searchParams.get('code') ?? url.searchParams.get('invite')
    if (fromQuery?.trim()) return fromQuery.trim()
    const pathMatch = url.pathname.match(/\/join\/([^/?#]+)/i)
    if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]).trim()
  } catch {
    /* kein URL-Format */
  }

  return trimmed
}

export function normalizeInviteCodeInput(input: string): string {
  return input.trim()
}
