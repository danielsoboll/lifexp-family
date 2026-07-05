'use client'

import { useEffect, useMemo, useState } from 'react'

import FamilyGroupPortrait from './FamilyGroupPortrait'
import QuestEditSheet from './QuestEditSheet'
import { useFamily, FAMILY_DATA_CHANGED_EVENT } from './FamilyProvider'
import { fetchTodayAndTomorrowQuests } from '../lib/family/quests'
import { canSessionModifyQuest } from '../lib/family/questConfirmation'
import type { QuestWithCompletion } from '../lib/family/types'
import { groupQuestsForDisplay } from '../lib/family/questMemberGroups'
import { memberAccentStyle, normalizeMemberAccentKey, type MemberAccentKey } from '../lib/family/memberAccentColor'
import QuestCard from './QuestCard'

function renderQuestCard(
  quest: QuestWithCompletion,
  props: {
    children: ReturnType<typeof useFamily>['children']
    parents: ReturnType<typeof useFamily>['parents']
    session: ReturnType<typeof useFamily>['session']
    grouped?: boolean
    familyWide?: boolean
    familyAccentKey?: MemberAccentKey
    onManage: (quest: QuestWithCompletion) => void
  },
) {
  const manageable =
    props.session && !quest.recurring_template_id ? canSessionModifyQuest(quest, props.session) : false
  return (
    <QuestCard
      key={quest.id}
      quest={quest}
      children={props.children}
      parents={props.parents}
      grouped={props.grouped}
      familyWide={props.familyWide}
      familyAccentKey={props.familyAccentKey}
      manageable={manageable}
      onManage={manageable ? () => props.onManage(quest) : undefined}
    />
  )
}

export default function QuestList() {
  const { family, children, parents, session } = useFamily()
  const [quests, setQuests] = useState<QuestWithCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editQuest, setEditQuest] = useState<QuestWithCompletion | null>(null)

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
  }, [family?.id])

  const groups = useMemo(
    () => groupQuestsForDisplay(quests, parents, children, family?.name),
    [quests, parents, children, family?.name],
  )

  const cardProps = useMemo(
    () => ({
      children,
      parents,
      session,
      onManage: setEditQuest,
    }),
    [children, parents, session],
  )

  if (!family) return null

  if (loading) {
    return <p className="text-sm text-slate-950 dark:text-slate-400">Quests werden geladen …</p>
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
      <p className="text-sm text-slate-950 dark:text-slate-400">
        Noch keine Quests — trage die erste für jemand anderen ein.
      </p>
    )
  }

  const familyAccentKey = normalizeMemberAccentKey(family.accent_key)

  return (
    <>
      <div className="space-y-5">
        {groups.map((group) => {
          if (group.kind === 'family') {
            const accent = memberAccentStyle(familyAccentKey)
            return (
              <section key="family">
                <div className="flex items-center gap-3">
                  <FamilyGroupPortrait className="w-16 shrink-0" />
                  <h2 className={`text-lg font-bold tracking-tight ${accent.nameClass}`}>{group.label}</h2>
                </div>
                <div className="mt-2 space-y-2.5">
                  {group.quests.map((quest) =>
                    renderQuestCard(quest, {
                      ...cardProps,
                      grouped: true,
                      familyWide: true,
                      familyAccentKey,
                    }),
                  )}
                </div>
              </section>
            )
          }

          const accent = memberAccentStyle(group.accentKey)
          return (
            <section key={`${group.assignee.type}:${group.assignee.id}`}>
              <h2 className={`text-lg font-bold tracking-tight ${accent.nameClass}`}>{group.label}</h2>
              <div className="mt-2 space-y-2.5">
                {group.quests.map((quest) => renderQuestCard(quest, { ...cardProps, grouped: true }))}
              </div>
            </section>
          )
        })}
      </div>

      <QuestEditSheet quest={editQuest} open={editQuest !== null} onClose={() => setEditQuest(null)} />
    </>
  )
}
