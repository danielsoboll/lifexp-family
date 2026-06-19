/** Supabase `area_info.subarea`-Werte für Unterseiten (Area = Hauptbereich). */
export const AREA_INFO_SUBAREA = {
  bewegung: {
    arbeit: 'Arbeit',
    schritte: 'Schritte',
    training: 'Training',
  },
  mein_tag: {
    schlaf: 'Schlaf',
    sunAir: 'Sonne/frische Luft',
    wellbeing: 'Befinden',
  },
  ernaehrung: {
    grob: 'Grob schätzen',
    genau: 'Genau',
  },
  plus: {
    motivation: 'Motivation',
    alcohol: 'Alkohol',
    glaubenssatz: 'Glaubenssatz',
    heute: 'Heute',
    gestern: 'Gestern',
    morgen: 'Morgen',
    datum: 'Datum',
    woche: 'Woche',
  },
  ziele: {
    alkohol: 'Ziele',
    motivation: 'Ziele',
  },
} as const

export function areaInfoHref(parentPath: string): string {
  const base = parentPath.replace(/\/$/, '')
  return `${base}/info`
}
