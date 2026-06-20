'use client'

import { useEffect, useMemo, useState } from 'react'

import MemberDailyXpBar from './MemberDailyXpBar'
import ProgressBar from './ProgressBar'
import { useFamily } from './FamilyProvider'
import { formatChildAge } from '../lib/family/memberGender'
import { formatParentDisplayName } from '../lib/family/familyDisplayName'
import { resolveChildAvatar, resolveParentAvatar } from '../lib/family/memberAvatar'
import { cetToday } from '../lib/cetDate'
import { fetchQuestsWithCompletions, questAppliesToMember } from '../lib/family/quests'
import type { QuestWithCompletion } from '../lib/family/types'
import { CARD_SURFACE_CLASS } from '../lib/appShell'

type MemberDetailViewProps = {
  memberKind: 'parent' | 'child'
  memberId: string
}

export default function MemberDetailView({ memberKind, memberId }: MemberDetailViewProps) {
  const { family, parents, children, loading: familyLoading } = useFamily()
  const [quests, setQuests] = useState<QuestWithCompletion[]>([])
  const [questsLoading, setQuestsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const parent = memberKind === 'parent' ? parents.find((p) => p.id === memberId) : undefined
  const child = memberKind === 'child' ? children.find((c) => c.id === memberId) : undefined

  useEffect(() => {
    if (!family) return
    let cancelled = false

    void (async () => {
      setQuestsLoading(true)
      const { quests: rows, error: fetchError } = await fetchQuestsWithCompletions(family.id, {
        fromTaskDate: cetToday(),
        toTaskDate: cetToday(),
      })
      if (cancelled) return
      setQuestsLoading(false)
      if (fetchError) {
        setError(fetchError.message)
        setQuests([])
        return
      }
      setError(null)
      setQuests(rows.filter((q) => questAppliesToMember(q.child_id, q.assignees, memberKind, memberId)))
    })()

    return () => {
      cancelled = true
    }
  }, [family, memberKind, memberId])

  const displayName =
    memberKind === 'parent' && parent
      ? formatParentDisplayName(parent.display_name, parent.gender)
      : child?.display_name

  const todayXp = memberKind === 'parent' ? (parent?.todayXp ?? 0) : (child?.todayXp ?? 0)

  const avatar =
    memberKind === 'parent' && parent
      ? resolveParentAvatar(parent.gender, parent.avatar_url)
      : child
        ? resolveChildAvatar(child.gender, child.age, child.portrait_id)
        : { src: null, error: null }

  const completedCount = useMemo(() => {
    return quests.filter((q) =>
      memberKind === 'parent'
        ? q.completionParentIds.includes(memberId)
        : q.completionChildIds.includes(memberId),
    ).length
  }, [quests, memberKind, memberId])

  const questProgress = quests.length > 0 ? Math.round((completedCount / quests.length) * 100) : 0

  if (familyLoading) {
    return <p className="text-sm text-slate-600 dark:text-slate-400">Wird geladen …</p>
  }

  if (!displayName) {
    return <p className="text-sm text-slate-600 dark:text-slate-400">Familienmitglied nicht gefunden.</p>
  }

  return (
    <div className="space-y-6">
      <article
        className={`${CARD_SURFACE_CLASS} mx-auto flex w-full max-w-[11rem] flex-col items-center rounded-2xl p-2 text-center`}
      >
        {avatar.error ? (
          <div className="flex aspect-[5/6] w-full items-center justify-center rounded-xl bg-slate-100 px-1 dark:bg-slate-800">
            <p className="text-[10px] leading-tight text-amber-800 dark:text-amber-200">{avatar.error}</p>
          </div>
        ) : avatar.src ? (
          <div className="relative aspect-[5/6] w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatar.src} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
          </div>
        ) : (
          <div className="flex aspect-[5/6] w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">Kein Portrait</span>
          </div>
        )}
        <div className="mt-1.5 w-full px-0.5">
          <MemberDailyXpBar todayXp={todayXp} />
        </div>
        <h1 className="mt-1 line-clamp-2 text-sm font-bold text-slate-900 dark:text-slate-100">{displayName}</h1>
        {memberKind === 'child' && child && formatChildAge(child.age) ? (
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{formatChildAge(child.age)}</p>
        ) : null}
      </article>

      <section className={`${CARD_SURFACE_CLASS} space-y-3 rounded-2xl p-4`}>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Quests heute</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {completedCount} von {quests.length} erledigt
          </p>
        </div>
        {quests.length > 0 ? <ProgressBar progress={questProgress} /> : null}

        {questsLoading ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Quests werden geladen …</p>
        ) : error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : quests.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Keine Quests für heute zugewiesen.</p>
        ) : (
          <ul className="space-y-2">
            {quests.map((quest) => {
              const done =
                memberKind === 'parent'
                  ? quest.completionParentIds.includes(memberId)
                  : quest.completionChildIds.includes(memberId)

              return (
                <li
                  key={quest.id}
                  className={`rounded-xl border-2 px-3 py-2.5 ${
                    done
                      ? 'border-emerald-300/80 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/30'
                      : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{quest.title}</p>
                      {quest.description ? (
                        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{quest.description}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                      +{quest.xp_reward} XP
                    </span>
                  </div>
                  <p
                    className={`mt-1.5 text-xs font-bold uppercase tracking-wide ${
                      done ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {done ? 'Erledigt' : 'Offen'}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
