'use client'

import { useState } from 'react'

import DangerConfirmAction from './DangerConfirmAction'
import SheetPortal from './SheetPortal'
import SheetViewportChrome from './SheetViewportChrome'
import { notifyFamilyDataChanged } from './FamilyProvider'
import { CARD_SURFACE_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'
import {
  assignFamilyPersonalGoalXp,
  deleteFamilyPersonalGoal,
  updateFamilyPersonalGoalXp,
} from '../lib/family/familyPersonalGoals'
import { focusFormField } from '../lib/mobileFormFocus'
import { keyboardScrollPaddingBottom } from '../lib/keyboardScrollPadding'
import { useVisualViewportLayout } from '../lib/useVisualViewportLayout'

type AdminFamilyPersonalGoalXpSheetProps = {
  familyId: string
  familyName: string
  goalId: string
  goalTitle: string
  currentTargetXp: number | null
  canAdmin: boolean
  onClose: () => void
  onSaved: () => void
}

export default function AdminFamilyPersonalGoalXpSheet({
  familyId,
  familyName,
  goalId,
  goalTitle,
  currentTargetXp,
  canAdmin,
  onClose,
  onSaved,
}: AdminFamilyPersonalGoalXpSheetProps) {
  const [xp, setXp] = useState(currentTargetXp ? String(currentTargetXp) : '100')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const viewport = useVisualViewportLayout()

  const scrollPaddingBottom = keyboardScrollPaddingBottom(viewport, 'sheet')

  const handleSave = async () => {
    const parsed = Number.parseInt(xp, 10)
    if (!Number.isFinite(parsed)) {
      setError('Bitte eine Zahl eingeben.')
      return
    }

    setLoading(true)
    setError(null)
    const { error: saveError } = currentTargetXp
      ? await updateFamilyPersonalGoalXp({
          familyId,
          goalId,
          targetXp: parsed,
          canAdmin,
        })
      : await assignFamilyPersonalGoalXp({
          familyId,
          goalId,
          targetXp: parsed,
          canAdmin,
        })
    setLoading(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    onSaved()
    onClose()
  }

  const handleDelete = async (): Promise<boolean> => {
    setDeleteBusy(true)
    setDeleteError(null)
    const { error: delError } = await deleteFamilyPersonalGoal({
      familyId,
      goalId,
      canAdmin,
    })
    setDeleteBusy(false)

    if (delError) {
      setDeleteError(delError.message)
      return false
    }

    notifyFamilyDataChanged()
    onSaved()
    onClose()
    return true
  }

  return (
    <SheetPortal>
      <div
        className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/40 dark:bg-black/55"
        onClick={onClose}
        role="presentation"
      >
        <SheetViewportChrome viewport={viewport} />
        <div
          className={`lifexp-bottom-sheet ${CARD_SURFACE_CLASS} flex max-h-[85dvh] flex-col rounded-t-3xl px-5 pt-5 shadow-2xl`}
          style={
            viewport.keyboardOpen
              ? { maxHeight: `${Math.max(viewport.height - 8, 260)}px` }
              : undefined
          }
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-slate-400/70 dark:bg-slate-500" />

          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            style={{ scrollPaddingBottom }}
          >
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">XP für Ziel vergeben</h2>
            <p className="mt-1 text-sm text-slate-950 dark:text-slate-300">{goalTitle}</p>
            <p className="mt-2 text-xs text-slate-950 dark:text-slate-400">
              Wie viele XP soll die Familie für dieses Ziel sammeln? (1–999)
            </p>

            <label htmlFor="family-goal-xp" className="mt-4 mb-1 block text-sm font-semibold">
              Ziel-XP
            </label>
            <input
              id="family-goal-xp"
              type="number"
              min={1}
              max={999}
              inputMode="numeric"
              value={xp}
              onChange={(event) => setXp(event.target.value)}
              onFocus={(event) => focusFormField(event.currentTarget)}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-lg font-bold tabular-nums dark:border-slate-600 dark:bg-slate-900"
            />

            {error ? (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </p>
            ) : null}

            <div className="mt-5 space-y-3" style={{ paddingBottom: scrollPaddingBottom }}>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`${PRESSABLE_3D_CLASS} flex-1 rounded-xl border-2 border-slate-400 bg-gradient-to-b from-slate-100 to-slate-300 px-4 py-3 text-sm font-bold text-slate-900 dark:border-slate-600 dark:from-slate-700 dark:to-slate-900 dark:text-slate-100`}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleSave()}
                  className={`${PRESSABLE_3D_CLASS} flex-1 rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-60`}
                >
                  {loading ? 'Speichern …' : 'Speichern'}
                </button>
              </div>

              <DangerConfirmAction
                triggerLabel="Ziel löschen"
                confirmTitle={`„${goalTitle}" wirklich löschen?`}
                confirmDescription="Das Ziel und der gesamte Fortschritt werden entfernt. Das kann nicht rückgängig gemacht werden."
                onConfirm={handleDelete}
                busy={deleteBusy}
                error={deleteError}
              />
            </div>
          </div>
        </div>
      </div>
    </SheetPortal>
  )
}
