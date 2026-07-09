'use client'

import { useRef, useState } from 'react'

import SheetPortal from './SheetPortal'
import { CARD_SURFACE_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'
import { multilineTextInputProps } from '../lib/formInputAutofill'
import { saveQuestCompletionAssigneeContent } from '../lib/family/questCompletionPlus'

type QuestCompletionPhotoSheetProps = {
  familyId: string
  completionId: string
  questTitle: string
  onClose: () => void
  onUploaded: () => void
}

export default function QuestCompletionPhotoSheet({
  familyId,
  completionId,
  questTitle,
  onClose,
  onUploaded,
}: QuestCompletionPhotoSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onPickFiles = (picked: FileList | null) => {
    if (!picked) return
    const next = [...files, ...Array.from(picked)].slice(0, 2)
    setFiles(next)
    setPreviews(next.map((file) => URL.createObjectURL(file)))
  }

  const removeAt = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => {
      const url = prev[index]
      if (url) URL.revokeObjectURL(url)
      return prev.filter((_, i) => i !== index)
    })
  }

  const hasContent = files.length > 0 || message.trim().length > 0

  const handleSend = async () => {
    if (!hasContent) {
      onClose()
      return
    }
    setLoading(true)
    setError(null)
    const { error: uploadError } = await saveQuestCompletionAssigneeContent({
      familyId,
      completionId,
      message: message.trim() || undefined,
      files,
    })
    setLoading(false)
    if (uploadError) {
      setError(uploadError.message)
      return
    }
    onUploaded()
    onClose()
  }

  return (
    <SheetPortal>
      <div
        className="fixed inset-0 z-[120] flex flex-col justify-end bg-slate-950/45 dark:bg-black/55"
        onClick={onClose}
        role="presentation"
      >
        <div
          className={`lifexp-bottom-sheet ${CARD_SURFACE_CLASS} rounded-t-3xl px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl`}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-400/70 dark:bg-slate-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Nachricht & Fotos (PLUS)</h2>
          <p className="mt-1 text-sm text-slate-950 dark:text-slate-300">
            Optional Text und bis zu 2 Fotos zu „{questTitle}“ — z. B. „Zimmer ist sauber!“
          </p>

          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-semibold text-slate-950 dark:text-slate-200">Deine Nachricht</span>
            <textarea
              {...multilineTextInputProps('lifexp-quest-completion-assignee-message')}
              rows={3}
              maxLength={280}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="z. B. Fertig — alles aufgeräumt!"
              className="w-full resize-none rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            />
          </label>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(event) => onPickFiles(event.target.files)}
          />

          <div className="mt-4 flex gap-3">
            {previews.map((src, index) => (
              <div key={src} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-24 w-24 rounded-xl object-cover" />
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="absolute -right-1 -top-1 rounded-full border border-slate-300 bg-white px-1.5 text-xs font-bold dark:border-slate-600 dark:bg-slate-900"
                  aria-label="Foto entfernen"
                >
                  ✕
                </button>
              </div>
            ))}
            {files.length < 2 ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={`${PRESSABLE_3D_CLASS} flex h-24 w-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-500 bg-emerald-50/80 text-xs font-bold text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-100`}
              >
                + Foto
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`${PRESSABLE_3D_CLASS} flex-1 rounded-xl border-2 border-slate-400 bg-gradient-to-b from-slate-100 to-slate-300 px-4 py-3 text-sm font-bold text-slate-900 dark:border-slate-600 dark:from-slate-700 dark:to-slate-900 dark:text-slate-100`}
            >
              {hasContent ? 'Überspringen' : 'Schließen'}
            </button>
            {hasContent ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSend()}
                className={`${PRESSABLE_3D_CLASS} flex-1 rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-60`}
              >
                {loading ? 'Wird gesendet …' : 'Senden'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </SheetPortal>
  )
}
