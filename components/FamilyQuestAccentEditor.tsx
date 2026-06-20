'use client'

import { useState } from 'react'

import MemberAccentPicker from './MemberAccentPicker'
import MemberEditorSaveBar from './MemberEditorSaveBar'
import { notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import { updateFamilyAccentKey } from '../lib/family/families'
import { formatFamilyHeading } from '../lib/family/familyDisplayName'
import { normalizeMemberAccentKey, type MemberAccentKey } from '../lib/family/memberAccentColor'
import type { Family } from '../lib/family/types'
import { CARD_SURFACE_CLASS } from '../lib/appShell'

type FamilyQuestAccentEditorProps = {
  family: Family
}

export default function FamilyQuestAccentEditor({ family }: FamilyQuestAccentEditorProps) {
  const { refresh } = useFamily()
  const [accentKey, setAccentKey] = useState<MemberAccentKey>(normalizeMemberAccentKey(family.accent_key))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const isDirty = accentKey !== normalizeMemberAccentKey(family.accent_key)

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const { error: saveError } = await updateFamilyAccentKey(family.id, accentKey)
    setLoading(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setSuccess(true)
    notifyFamilyDataChanged()
    await refresh()
  }

  return (
    <form onSubmit={(e) => void handleSave(e)} className={`${CARD_SURFACE_CLASS} space-y-3 rounded-xl p-3`}>
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Familien-Quests</h2>
        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
          Farbe für {formatFamilyHeading(family.name)} — wenn eine Quest für „Alle“ eingetragen wird.
        </p>
      </div>
      <MemberAccentPicker value={accentKey} onChange={setAccentKey} legend="Familien-Farbe" />
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {success ? <p className="text-xs text-emerald-700 dark:text-emerald-300">Gespeichert.</p> : null}
      {isDirty ? <MemberEditorSaveBar loading={loading} /> : null}
    </form>
  )
}
