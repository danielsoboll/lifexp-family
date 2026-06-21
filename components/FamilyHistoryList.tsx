'use client'

import { useEffect, useMemo, useState } from 'react'

import FamilyTodayXpBoard from './FamilyTodayXpBoard'
import { useFamily } from './FamilyProvider'
import { fetchFamilyHistory } from '../lib/family/questCompletions'
import { formatParentDisplayName } from '../lib/family/familyDisplayName'
import { CARD_SURFACE_CLASS } from '../lib/appShell'

type HistoryEntry = {
  id: string
  kind: 'quest' | 'xp'
  title: string
  subtitle: string
  date: string
  xp: number
  memberKind: 'parent' | 'child' | null
  memberId: string | null
}

export default function FamilyHistoryList() {
  const { family, parents, children } = useFamily()
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const nameByMemberId = useMemo(() => {
    const map = new Map<string, string>()
    for (const parent of parents) map.set(parent.id, formatParentDisplayName(parent.display_name, parent.gender))
    for (const child of children) map.set(child.id, child.display_name)
    return map
  }, [parents, children])

  useEffect(() => {
    if (!family) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      const { entries: rows, error: fetchError } = await fetchFamilyHistory(family.id)
      if (cancelled) return
      setLoading(false)
      if (fetchError) {
        setError(fetchError.message)
        return
      }
      setError(null)
      setEntries(rows)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [family])

  if (!family) return null

  return (
    <div className="space-y-6">
      <FamilyTodayXpBoard />

      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Aktivitäten</h2>

        {loading ? (
          <p className="text-sm text-slate-950 dark:text-slate-400">Verlauf wird geladen …</p>
        ) : error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-950 dark:text-slate-400">Noch keine Einträge im Verlauf.</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const memberName =
                entry.memberId && nameByMemberId.get(entry.memberId)
                  ? nameByMemberId.get(entry.memberId)
                  : 'Familienmitglied'

              return (
                <article key={entry.id} className={`${CARD_SURFACE_CLASS} rounded-xl px-4 py-3`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{entry.title}</p>
                      <p className="text-xs text-slate-950 dark:text-slate-400">
                        {entry.date} · {memberName} · {entry.subtitle}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      {entry.xp >= 0 ? '+' : ''}
                      {entry.xp} XP
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
