#!/usr/bin/env node
/**
 * Infotexte für alle Info-Buttons in area_info (Wildcard-Zeilen goal_type/gender/alcohol_mode = both).
 *
 *   node scripts/seed-area-info.mjs
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://clkjvyxcbkexuzcwmwci.supabase.co'
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_kxwcVW9U9f59yN1ZNn9wxg_ukhJGOAs'

const supabase = createClient(supabaseUrl, supabaseKey)

const WILDCARD = { goal_type: 'both', gender: 'both', alcohol_mode: 'both', active: true }

/** @type {{ area: string, subarea: string | null, title: string, content: string }[]} */
const ENTRIES = [
  {
    area: 'Bewegung',
    subarea: null,
    title: 'Training',
    content:
      'Hier sammelst du Trainings-XP durch Schritte, Training oder Bewegung bei der Arbeit. Wähle ehrlich, was heute stattgefunden hat — regelmäßige Bewegung zählt mehr als Perfektion. Bei besonders viel Training kann der Boost-Modus zusätzliche XP bringen.',
  },
  {
    area: 'Bewegung',
    subarea: 'Arbeit',
    title: 'Bewegung bei der Arbeit',
    content:
      'Bewegung im Arbeitsalltag zählt: Stehen, Gehen, Treppen oder aktive Pausen. Wähle die Stufe, die deinem Tag am ehesten entspricht — jede ehrliche Angabe bringt Trainings-XP.',
  },
  {
    area: 'Bewegung',
    subarea: 'Schritte',
    title: 'Schritte',
    content:
      'Tägliche Schritte sind der einfachste Weg zu Bewegungs-XP. Gib an, ob du heute wenig, mittel oder viel unterwegs warst — ohne exakte Schrittzahl.',
  },
  {
    area: 'Bewegung',
    subarea: 'Training',
    title: 'Training',
    content:
      'Geplante Sporteinheiten oder intensivere Bewegung. Je nach Umfang und Intensität gibt es unterschiedlich viel XP; bei besonders viel Training kann der Boost-Modus starten.',
  },
  {
    area: 'Ernährung',
    subarea: null,
    title: 'Ernährung',
    content:
      'Trage deine Mahlzeiten ein — grob geschätzt oder genau mit Kalorien und Protein. Am Tagesende bewertest du deine Ernährung und erhältst Ernährungs-XP passend zu deinen persönlichen Zielwerten.',
  },
  {
    area: 'Ernährung',
    subarea: 'Grob schätzen',
    title: 'Grob schätzen',
    content:
      'Schnelle Schätzung pro Mahlzeit — gut unterwegs oder wenn du keine genauen Werte hast. Am Tagesende fließt die grobe Einschätzung in deine Ernährungsbewertung ein.',
  },
  {
    area: 'Ernährung',
    subarea: 'Genau',
    title: 'Genau erfassen',
    content:
      'Kalorien und Protein pro Mahlzeit konkret eintragen — aus der Liste oder mit eigenen Lebensmitteln. Genauere Daten helfen bei der Tagesbewertung und deinen Zielwerten.',
  },
  {
    area: 'Wissen',
    subarea: null,
    title: 'Wissen',
    content:
      'Jeden Tag eine kurze Frage zu Ernährung, Bewegung oder Gewohnheiten. Mit der richtigen Antwort sammelst du Wissens-XP. Die Fragen wechseln — auch wenn du einmal danebenliegst, lohnt sich das Mitmachen zum Lernen.',
  },
  {
    area: 'Mein Tag',
    subarea: null,
    title: 'Mein Tag',
    content:
      'Ein kurzer Tages-Check: Schlaf, Befinden sowie Sonne und frische Luft. So erkennst du Muster und sammelst Mein-Tag-XP — ohne lange Formulare, nur ein ehrlicher Moment für dich.',
  },
  {
    area: 'Mein Tag',
    subarea: 'Schlaf',
    title: 'Schlaf',
    content:
      'Wie gut hast du geschlafen? Eine ehrliche Einschätzung reicht — ohne Tracker. Schlaf beeinflusst Energie, Befinden und oft auch deine Ernährung im Alltag.',
  },
  {
    area: 'Mein Tag',
    subarea: 'Befinden',
    title: 'Befinden',
    content:
      'Wie fühlst du dich heute? Stimmung, Stress oder Energie — ein kurzer Check-in für mehr Selbstwahrnehmung und Mein-Tag-XP.',
  },
  {
    area: 'Mein Tag',
    subarea: 'Sonne/frische Luft',
    title: 'Sonne & frische Luft',
    content:
      'Warst du heute draußen? Tageslicht und frische Luft unterstützen Wohlbefinden und helfen, gesunde Routinen beizubehalten.',
  },
  {
    area: 'Plus',
    subarea: null,
    title: 'Plus',
    content:
      'Freiwillige Extras neben Ernährung, Bewegung und Wissen: Aufgaben planen, Motivation, Glaubenssatz oder Alkohol tracken. Plus-XP belohnt Bausteine, die dein persönliches Ziel unterstützen.',
  },
  {
    area: 'Plus',
    subarea: 'Motivation',
    title: 'Motivation',
    content:
      'Täglicher Motivationssatz, wenn du ihn in den Zielvorgaben aktiviert hast. Ein kurzer Impuls am Tag — optional, aber hilfreich für Fokus und Routine.',
  },
  {
    area: 'Plus',
    subarea: 'Alkohol',
    title: 'Alkohol',
    content:
      'Trage ein, ob und wie viel du getrunken hast — nur wenn du Alkohol-Tracking in den Zielvorgaben eingeschaltet hast. Es geht um ehrliche Dokumentation, nicht um Bewertung oder Schuld.',
  },
  {
    area: 'Plus',
    subarea: 'Glaubenssatz',
    title: 'Glaubenssatz',
    content:
      'Ein Glaubenssatz pro Woche zum Reflektieren und Umsetzen. Er unterstützt dein Mindset neben Ernährung und Bewegung und gibt Plus-XP bei der Bearbeitung.',
  },
  {
    area: 'Liga',
    subarea: null,
    title: 'Liga',
    content:
      'Mit Liga-XP steigst du Stufe für Stufe von unten nach oben — Richtung Elite. Du erhältst Liga-XP unter anderem durch „Bin dabei!“ auf der XP-Seite und durch gute Tagesbewertungen in den Bereichen.',
  },
  {
    area: 'Aufgabenplaner',
    subarea: null,
    title: 'Aufgabenplaner',
    content:
      'Plane und erledige Aufgaben für heute, morgen, gestern oder ein freies Datum. Erledigte Aufgaben geben Plus-XP. Der Wochenüberblick hilft dir, Vorsätze im Blick zu behalten.',
  },
  {
    area: 'Aufgabenplaner',
    subarea: 'Heute',
    title: 'Aufgaben heute',
    content:
      'Was steht heute an? Trage Aufgaben ein und hake sie ab — erledigte Punkte geben Plus-XP. Kleine Schritte zählen.',
  },
  {
    area: 'Aufgabenplaner',
    subarea: 'Gestern',
    title: 'Aufgaben gestern',
    content:
      'Rückblick auf gestern: Was war geplant, was hast du geschafft? Hilft dir, Muster zu erkennen und den Plan für heute anzupassen.',
  },
  {
    area: 'Aufgabenplaner',
    subarea: 'Morgen',
    title: 'Aufgaben morgen',
    content:
      'Plane schon heute, was morgen ansteht. So startest du vorbereitet in den Tag und kannst Plus-XP für erledigte Aufgaben sammeln.',
  },
  {
    area: 'Aufgabenplaner',
    subarea: 'Datum',
    title: 'Aufgaben nach Datum',
    content:
      'Wähle ein beliebiges Datum und plane oder prüfe Aufgaben dafür — praktisch für Termine, die nicht nur heute oder morgen sind.',
  },
  {
    area: 'Aufgabenplaner',
    subarea: 'Woche',
    title: 'Wochenplan',
    content:
      'Überblick über deine Aufgaben in der Woche. So siehst du auf einen Blick, was ansteht, und kannst Vorsätze besser einhalten.',
  },
  {
    area: 'Was jetzt tun',
    subarea: null,
    title: 'Was jetzt tun?',
    content:
      'Hier siehst du, was als Nächstes am sinnvollsten ist — abhängig von deinem Tagesstand in Ernährung, Bewegung, Wissen, Mein Tag und Plus. Die Empfehlungen sind Orientierung, kein Muss.',
  },
  {
    area: 'Alkohol',
    subarea: 'Ziele',
    title: 'Alkohol mit tracken?',
    content:
      'Optional: Wenn du gelegentlich oder öfter etwas trinkst, kann Tracking helfen, Muster zu sehen — ohne Verzicht-Versprechen. Du legst später deine persönlichen Grenzen für „wenig“ und „viel“ fest. Alle Eingaben werden vertraulich behandelt.',
  },
  {
    area: 'Motivation',
    subarea: 'Ziele',
    title: 'Tägliche Motivation',
    content:
      'Optional: Ein kurzer Motivationssatz pro Tag im Plus-Bereich. Viele finden das hilfreich für Fokus; du kannst es jederzeit in den Zielvorgaben wieder ausschalten.',
  },
]

function normSubarea(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function rowKey(area, subarea) {
  return `${area.trim().toLowerCase()}|${normSubarea(subarea)}`
}

function isWildcardGoal(value) {
  const v = String(value ?? '').trim().toLowerCase()
  return v === 'both' || v === 'all' || v === 'egal'
}

async function main() {
  const { data: existing, error: loadError } = await supabase.from('area_info').select('*')

  if (loadError) {
    console.error('Laden fehlgeschlagen:', loadError.message)
    process.exit(1)
  }

  const wildcardByKey = new Map()
  for (const row of existing ?? []) {
    if (!isWildcardGoal(row.goal_type)) continue
    wildcardByKey.set(rowKey(row.area, row.subarea), row)
  }

  let inserted = 0
  let updated = 0

  for (const entry of ENTRIES) {
    const key = rowKey(entry.area, entry.subarea)
    const match = wildcardByKey.get(key)
    const payload = {
      area: entry.area,
      subarea: entry.subarea,
      title: entry.title,
      content: entry.content,
      ...WILDCARD,
    }

    if (match) {
      const { error } = await supabase.from('area_info').update(payload).eq('id', match.id)
      if (error) {
        console.error(`Update fehlgeschlagen (${entry.area} / ${entry.subarea ?? '–'}):`, error.message)
        process.exit(1)
      }
      updated += 1
      console.log(`  aktualisiert: ${entry.area} / ${entry.subarea ?? 'Haupt'}`)
    } else {
      const { error } = await supabase.from('area_info').insert(payload)
      if (error) {
        console.error(`Insert fehlgeschlagen (${entry.area} / ${entry.subarea ?? '–'}):`, error.message)
        process.exit(1)
      }
      inserted += 1
      console.log(`  neu: ${entry.area} / ${entry.subarea ?? 'Haupt'}`)
    }
  }

  // Test-Zeile aus früherem Probe-Insert entfernen
  await supabase.from('area_info').delete().eq('area', 'Test')

  const { count, error: countError } = await supabase
    .from('area_info')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('Zählen fehlgeschlagen:', countError.message)
    process.exit(1)
  }

  console.log(`Fertig: ${inserted} neu, ${updated} aktualisiert. area_info enthält ${count} Zeilen.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
