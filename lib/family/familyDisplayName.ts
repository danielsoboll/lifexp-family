import type { ParentGender } from './memberGender'

/** Anzeigename auf dem Dashboard: immer mit „Familie “ davor. */
export function formatFamilyHeading(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return 'Familie'
  if (/^familie\s/i.test(trimmed)) return trimmed
  return `Familie ${trimmed}`
}

/** Papa/Mama vor dem Namen — nur für male/female; Opa/Oma und Kinder unverändert. */
export function formatParentDisplayName(displayName: string, gender: ParentGender): string {
  const name = displayName.trim()
  if (!name) return gender === 'male' ? 'Papa' : gender === 'female' ? 'Mama' : name

  if (gender === 'male') {
    if (/^papa\s/i.test(name)) return name
    return `Papa ${name}`
  }

  if (gender === 'female') {
    if (/^mama\s/i.test(name)) return name
    return `Mama ${name}`
  }

  return name
}
