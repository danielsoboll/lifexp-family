'use client'

import { portraitExpressionVariantsForBase, type AvatarPortraitId } from '../lib/family/memberAvatar'
import RoundPortraitReaction from './RoundPortraitReaction'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type QuestCreatorReactionFormProps = {
  basePortraitId: AvatarPortraitId
  message: string
  selectedPortraitId: AvatarPortraitId
  onMessageChange: (value: string) => void
  onPortraitChange: (portraitId: AvatarPortraitId) => void
  disabled?: boolean
}

export default function QuestCreatorReactionForm({
  basePortraitId,
  message,
  selectedPortraitId,
  onMessageChange,
  onPortraitChange,
  disabled = false,
}: QuestCreatorReactionFormProps) {
  const variants = portraitExpressionVariantsForBase(basePortraitId)

  return (
    <div className="mt-3 space-y-3 rounded-xl border-2 border-amber-300/80 bg-amber-50/70 p-3 dark:border-amber-700/60 dark:bg-amber-950/25">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200">
        PLUS — Like zurückschicken
      </p>
      <p className="text-xs text-amber-950/90 dark:text-amber-100/90">
        Wähle dein Gesicht und einen kurzen Satz — {variants.length > 1 ? 'verschiedene Stimmungen' : 'dein Portrait'}.
      </p>

      <div className="flex flex-wrap gap-2">
        {variants.map((portraitId, index) => {
          const selected = selectedPortraitId === portraitId
          return (
            <button
              key={portraitId}
              type="button"
              disabled={disabled}
              onClick={() => onPortraitChange(portraitId)}
              className={`rounded-full p-0.5 transition ${
                selected ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-emerald-400' : 'opacity-80 hover:opacity-100'
              }`}
              aria-label={`Portrait ${index + 1}${selected ? ' (gewählt)' : ''}`}
              title={`Bild ${index + 1}`}
            >
              <RoundPortraitReaction portraitId={portraitId} sizeClass="h-12 w-12" />
            </button>
          )
        })}
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-950 dark:text-slate-200">Deine Nachricht</span>
        <input
          type="text"
          maxLength={280}
          disabled={disabled}
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder="z. B. Super gemacht!"
          className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
        />
      </label>

      {selectedPortraitId ? (
        <div className="flex items-center gap-2 text-xs text-slate-950 dark:text-slate-400">
          <RoundPortraitReaction portraitId={selectedPortraitId} sizeClass="h-8 w-8" />
          <span>Vorschau — so sieht es {message.trim() ? 'mit deinem Text' : 'aus'}.</span>
        </div>
      ) : null}
    </div>
  )
}

export function defaultReactionMessage(): string {
  return 'Super gemacht!'
}

export function defaultReactionPortrait(basePortraitId: AvatarPortraitId): AvatarPortraitId {
  const variants = portraitExpressionVariantsForBase(basePortraitId)
  return variants[Math.min(2, variants.length - 1)] ?? variants[0] ?? basePortraitId
}
