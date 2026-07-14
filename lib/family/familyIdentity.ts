import { formatFamilyHeading } from './familyDisplayName'

type FamilyIdentityInput = {
  id: string
  name?: string | null
  invite_code?: string | null
}

/**
 * Eindeutiger Familien-Indikator — nie der Name (gleichnamige Familien sind möglich).
 * Primär: Einladungscode. Fallback: Kurzform der UUID.
 */
export function familyUniqueCode(family: Pick<FamilyIdentityInput, 'id' | 'invite_code'>): string {
  const invite = family.invite_code?.trim()
  if (invite) return invite.toUpperCase()
  return family.id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

/** Anzeige: „Familie Müller · ABCD-2345“ */
export function formatFamilyIdentityLabel(family: FamilyIdentityInput): string {
  const heading = formatFamilyHeading(family.name)
  return `${heading} · ${familyUniqueCode(family)}`
}

/** Nur Code — z. B. in Admin-Zeilen. */
export function formatFamilyCodeLabel(family: Pick<FamilyIdentityInput, 'id' | 'invite_code'>): string {
  return familyUniqueCode(family)
}
