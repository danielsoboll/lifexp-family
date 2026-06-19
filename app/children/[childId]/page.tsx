'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

import AvatarCard from '../../../components/AvatarCard'
import PageHeaderBar from '../../../components/PageHeaderBar'
import ProgressBar from '../../../components/ProgressBar'
import { fetchChildById } from '../../../lib/family/children'
import { fetchXpEntriesForChild } from '../../../lib/family/xp'
import { fetchCompletionsForChildOnDate } from '../../../lib/family/questCompletions'
import { fetchQuestsForFamily, questAppliesToChild } from '../../../lib/family/quests'
import type { ChildProfile, DailyXpEntry, Quest } from '../../../lib/family/types'
import { cetToday } from '../../../lib/cetDate'
import { getLevel, getProgressPercent, getXpRemainingToNextLevel } from '../../../lib/level'
import { useFamily } from '../../../components/FamilyProvider'
import { CARD_SURFACE_CLASS, MAIN_PAGE_INSET_CLASS, MAIN_SHELL_CLASS } from '../../../lib/appShell'

function avatarGenderForChild(child: ChildProfile): 'male' | 'female' {
  if (child.avatar_key === 'girl' || child.avatar_key === 'female') return 'female'
  return 'male'
}

export default function ChildDetailPage() {
  const params = useParams<{ childId: string }>()
  const childId = params.childId
  const { family, children } = useFamily()
  const [child, setChild] = useState<ChildProfile | null>(null)
  const [entries, setEntries] = useState<DailyXpEntry[]>([])
  const [openQuests, setOpenQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)

  const cached = children.find((c) => c.id === childId)

  useEffect(() => {
    if (!family || !childId) return
    let cancelled = false

    void (async () => {
      setLoading(true)
      const [{ child: row }, { entries: xpRows }, { questIds }, { quests }] = await Promise.all([
        fetchChildById(childId),
        fetchXpEntriesForChild(childId, 20),
        fetchCompletionsForChildOnDate(childId, cetToday()),
        fetchQuestsForFamily(family.id),
      ])

      if (cancelled) return
      setChild(row ?? cached ?? null)
      setEntries(xpRows)
      const completed = new Set(questIds)
      setOpenQuests(
        quests.filter((q) => questAppliesToChild(q, childId) && !completed.has(q.id)),
      )
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [family, childId, cached])

  if (!family) return null

  const displayChild = child ?? cached
  if (!displayChild) {
    return (
      <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto w-full max-w-lg px-4`}>
        <PageHeaderBar backHref="/children" backLabel="Kinder" />
        <p className="text-sm text-slate-600">Kind nicht gefunden.</p>
      </main>
    )
  }

  const level = getLevel(displayChild.total_xp)
  const todayXp = cached?.todayXp ?? entries.filter((e) => e.entry_date === cetToday()).reduce((s, e) => s + e.xp_amount, 0)

  return (
    <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto w-full max-w-lg px-4`}>
      <PageHeaderBar backHref="/children" backLabel="Kinder" />
      <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">{displayChild.display_name}</h1>

      {loading ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Wird geladen …</p>
      ) : (
        <>
          <section className="mb-6 flex flex-col items-center gap-4">
            <AvatarCard
              level={level}
              dailyXp={todayXp}
              avatarGender={avatarGenderForChild(displayChild)}
              profileReady
            />
            <div className="w-full max-w-sm space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span>Level {level}</span>
                <span>{displayChild.total_xp} XP gesamt</span>
              </div>
              <ProgressBar progress={getProgressPercent(displayChild.total_xp)} />
              <p className="text-center text-xs text-slate-500">
                Noch {getXpRemainingToNextLevel(displayChild.total_xp)} XP bis Level {level + 1}
              </p>
            </div>
          </section>

          <section className={`${CARD_SURFACE_CLASS} mb-6 rounded-2xl p-4`}>
            <h2 className="font-bold text-slate-900 dark:text-slate-100">Offene Quests heute</h2>
            {openQuests.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Alle Quests für heute erledigt 🎉</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                {openQuests.map((q) => (
                  <li key={q.id}>
                    {q.title} (+{q.xp_reward} XP)
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-bold text-slate-900 dark:text-slate-100">Letzte XP-Einträge</h2>
            {entries.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">Noch keine XP gebucht.</p>
            ) : (
              <ul className="space-y-2">
                {entries.map((entry) => (
                  <li key={entry.id} className={`${CARD_SURFACE_CLASS} rounded-xl px-3 py-2 text-sm`}>
                    <div className="flex justify-between gap-2">
                      <span>{entry.entry_date}</span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                        {entry.xp_amount > 0 ? '+' : ''}
                        {entry.xp_amount} XP
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{entry.source}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  )
}
