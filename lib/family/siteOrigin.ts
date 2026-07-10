/** Kanonische Produktions-URL für Checkout-Redirects und teilbare Links. */
export const FAMILY_SITE_ORIGIN = 'https://family.life-xp.de'

const PRODUCTION_FAMILY_HOSTS = new Set(['family.life-xp.de', 'www.family.life-xp.de'])

/** Aktuelle App-Origin — für Stripe success/cancel/portal-Redirects an Edge Functions. */
export function resolveFamilySiteOrigin(): string {
  if (typeof window === 'undefined') return FAMILY_SITE_ORIGIN

  const host = window.location.hostname.toLowerCase()
  if (PRODUCTION_FAMILY_HOSTS.has(host) || host.endsWith('.vercel.app')) {
    return FAMILY_SITE_ORIGIN
  }

  if (host === 'localhost' || host === '127.0.0.1') {
    return window.location.origin.replace(/\/$/, '')
  }

  return FAMILY_SITE_ORIGIN
}
