import { createClient } from '@supabase/supabase-js'

import type { XpCategory } from './storage'

/** Projekt-URL (ohne `/rest/v1/` — der Client hängt die REST-Pfade selbst an). */
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://clkjvyxcbkexuzcwmwci.supabase.co'

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_kxwcVW9U9f59yN1ZNn9wxg_ukhJGOAs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type KnowledgeQuestionRow = Record<string, unknown>

export async function fetchKnowledgeQuestions(upTo = 3): Promise<{
  rows: KnowledgeQuestionRow[]
  error: Error | null
}> {
  const { data, error } = await supabase.from('knowledge_questions').select('*').limit(upTo)

  if (error) {
    return { rows: [], error: new Error(error.message) }
  }
  const rows = Array.isArray(data) ? (data as KnowledgeQuestionRow[]) : []
  return { rows, error: null }
}

export async function fetchFirstKnowledgeQuestion(): Promise<{
  row: KnowledgeQuestionRow | null
  error: Error | null
}> {
  const { rows, error } = await fetchKnowledgeQuestions(1)
  if (error) {
    return { row: null, error }
  }
  return { row: rows[0] ?? null, error: null }
}

/** Ersten sinnvollen Text aus der Zeile ziehen (Spaltenname variiert je nach Schema). */
export function knowledgeQuestionDisplayText(row: KnowledgeQuestionRow | null): string {
  if (!row) return ''
  const keys = ['question', 'question_text', 'text', 'title', 'prompt', 'body', 'content']
  for (const key of keys) {
    const v = row[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

/** Anzeige-Label für die Fragen-Kategorie (frei wählbare Spaltennamen). */
export function knowledgeQuestionCategoryLabel(row: KnowledgeQuestionRow | null): string {
  if (!row) return ''
  const keys = ['category', 'category_name', 'kategorie', 'topic', 'subject', 'area', 'thema']
  for (const key of keys) {
    const v = row[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return 'Wissen'
}

/** XP-Belohnung aus der Zeile; Standard 5 wenn nichts Passendes gesetzt ist. */
export function knowledgeQuestionXpAmount(row: KnowledgeQuestionRow | null): number {
  if (!row) return 5
  const keys = ['xp', 'xp_value', 'points', 'reward_xp', 'xp_amount', 'reward']
  for (const key of keys) {
    const v = row[key]
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.floor(v)
    if (typeof v === 'string') {
      const n = parseInt(v, 10)
      if (!Number.isNaN(n) && n > 0) return n
    }
  }
  return 5
}

/** Welche LifeXP-Kategorie die Belohnung gut schreibt (optional `xp_category` / `category_key` in der DB). */
export function xpCategoryFromKnowledgeRow(row: KnowledgeQuestionRow | null): XpCategory {
  if (!row) return 'plus'
  const raw = row.xp_category ?? row.category_key ?? row.xp_target
  if (typeof raw !== 'string') return 'plus'
  const k = raw.trim().toLowerCase().replace(/-/g, '_')
  if (k === 'bewegung') return 'bewegung'
  if (k === 'ernaehrung' || k === 'ernährung') return 'ernaehrung'
  if (k === 'meintag' || k === 'mein_tag') return 'meinTag'
  if (k === 'plus') return 'plus'
  return 'plus'
}
