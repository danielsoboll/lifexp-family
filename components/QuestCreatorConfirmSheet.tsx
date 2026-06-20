'use client'

import { useCallback, useEffect, useState } from 'react'

import { FAMILY_DATA_CHANGED_EVENT, notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import { cetFormatTimeFromIso } from '../lib/cetDate'
import { confirmQuestByCreator, fetchPendingCreatorConfirmations } from '../lib/family/questCompletions'
import type { PendingCreatorConfirmation } from '../lib/family/types'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

export default function QuestCreatorConfirmSheet() {
  const { family, parents, children, loading, hasSession } = useFamily()
  const [items, setItems] = useState<PendingCreatorConfirmation[]>([])
  const [visible, setVisible] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!family) {
      setItems([])
      return
    }
    const { items: rows, error: fetchError } = await fetchPendingCreatorConfirmations(family.id, parents, children)
    if (fetchError) {
      setError(fetchError.message)
      setItems([])
      return
    }
    setError(null)
    setItems(rows)
  }, [family, parents, children])

  useEffect(() => {
    if (loading || !hasSession || !family) {
      setItems([])
      setVisible(false)
      return
    }
    void load()
  }, [loading, hasSession, family, load])

  useEffect(() => {
    const onRefresh = () => void load()
    window.addEventListener(FAMILY_DATA_CHANGED_EVENT, onRefresh)
    return () => window.removeEventListener(FAMILY_DATA_CHANGED_EVENT, onRefresh)
  }, [load])

  useEffect(() => {
    if (items.length > 0) {
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
    return undefined
  }, [items.length])

  const confirm = async (item: PendingCreatorConfirmation) => {
    setBusyId(item.completionId)
    setError(null)
    const { error: confirmError } = await confirmQuestByCreator(item.completionId)
    setBusyId(null)
    if (confirmError) {
      setError(confirmError.message)
      return
    }
    notifyFamilyDataChanged()
    setItems((prev) => prev.filter((row) => row.completionId !== item.completionId))
  }

  if (items.length === 0) return null

  return (
    <div
      className={`fixed inset-0 z-[115] flex items-end justify-center transition-opacity duration-300 sm:items-center ${
        visible ? 'bg-slate-950/50 opacity-100' : 'pointer-events-none bg-slate-950/0 opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quest-confirm-sheet-title"
    >
      <div
        className={`w-full max-w-md transform px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out sm:px-0 sm:pb-0 ${
          visible ? 'translate-y-0' : 'translate-y-full sm:translate-y-8'
        }`}
      >
        <div className="overflow-hidden rounded-t-3xl border-2 border-emerald-500/80 bg-gradient-to-b from-emerald-50 via-white to-white shadow-[0_-8px_40px_-8px_rgba(5,150,105,0.35)] dark:border-emerald-600/70 dark:from-emerald-950/90 dark:via-slate-900 dark:to-slate-950 sm:rounded-3xl">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-emerald-300/80 dark:bg-emerald-700/80 sm:hidden" aria-hidden />
          <div className="border-b border-emerald-200/80 px-5 py-4 dark:border-emerald-900/60">
            <h2 id="quest-confirm-sheet-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Quests bestätigen
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Dein Familienmitglied hat erledigt — bitte bestätigen, damit XP gutgeschrieben werden.
            </p>
          </div>

          <ul className="max-h-[min(52vh,24rem)] space-y-3 overflow-y-auto px-4 py-4">
            {items.map((item) => {
              const timeLabel = cetFormatTimeFromIso(item.assigneeConfirmedAt)
              return (
                <li
                  key={item.completionId}
                  className="rounded-2xl border-2 border-slate-300/90 bg-white/95 p-4 dark:border-slate-600 dark:bg-slate-900/90"
                >
                  <p className="font-bold text-slate-900 dark:text-slate-100">{item.questTitle}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Bestätigt von <strong className="text-slate-800 dark:text-slate-200">{item.assigneeName}</strong>
                    {timeLabel ? `, ${timeLabel} Uhr` : null}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">+{item.xpReward} XP</p>
                  <button
                    type="button"
                    disabled={busyId === item.completionId}
                    onClick={() => void confirm(item)}
                    className={`${PRESSABLE_3D_CLASS} mt-3 w-full rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60`}
                  >
                    {busyId === item.completionId ? 'Wird bestätigt …' : 'OK — XP gutschreiben'}
                  </button>
                </li>
              )
            })}
          </ul>

          {error ? (
            <p className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
