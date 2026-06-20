'use client'

import { useEffect, useState } from 'react'

import { notifyFamilyDataChanged, useFamily, FAMILY_DATA_CHANGED_EVENT } from './FamilyProvider'
import { fetchTodayAndTomorrowQuests } from '../lib/family/quests'
import type { QuestWithCompletion } from '../lib/family/types'
import QuestCard from './QuestCard'

export default function QuestList() {
  const { family, children, parents, memberKind, parent, activeChild } = useFamily()
  const [quests, setQuests] = useState<QuestWithCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sessionMember =
    memberKind === 'child' && activeChild
      ? ({ type: 'child' as const, id: activeChild.id })
      : memberKind === 'parent' && parent
        ? ({ type: 'parent' as const, id: parent.id })
        : null

  useEffect(() => {
    if (!family) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      const { quests: rows, error: fetchError } = await fetchTodayAndTomorrowQuests(family.id)
      if (cancelled) return
      setLoading(false)
      if (fetchError) {
        setError(fetchError.message)
        return
      }
      setError(null)
      setQuests(rows)
    }

    void load()

    const onRefresh = () => void load()
    window.addEventListener(FAMILY_DATA_CHANGED_EVENT, onRefresh)
    return () => {
      cancelled = true
      window.removeEventListener(FAMILY_DATA_CHANGED_EVENT, onRefresh)
    }
  }, [family])

  if (!family) return null

  if (loading) {
    return <p className="text-sm text-slate-600 dark:text-slate-400">Quests werden geladen …</p>
  }

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        {error}
      </p>
    )
  }

  if (quests.length === 0) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Noch keine Quests — trage die erste für jemand anderen ein.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {quests.map((quest) => (
        <QuestCard
          key={quest.id}
          quest={quest}
          children={children}
          parents={parents}
          familyId={family.id}
          sessionMember={sessionMember}
          onCompleted={() => {
            notifyFamilyDataChanged()
          }}
        />
      ))}
    </div>
  )
}
