'use client'

import type { QuestCompletionPhoto } from '../lib/family/questCompletionPlus'

type QuestCompletionAssigneePhotosDisplayProps = {
  photos: readonly QuestCompletionPhoto[]
  message?: string | null
  label?: string
}

export default function QuestCompletionAssigneePhotosDisplay({
  photos,
  message,
  label = 'Deine Fotos',
}: QuestCompletionAssigneePhotosDisplayProps) {
  const trimmedMessage = message?.trim() ?? ''
  if (photos.length === 0 && !trimmedMessage) return null

  return (
    <div className="mt-2.5">
      {trimmedMessage ? (
        <p className="mb-2 rounded-lg bg-white/70 px-2.5 py-2 text-xs leading-relaxed text-slate-950 dark:bg-slate-900/50 dark:text-slate-200">
          {trimmedMessage}
        </p>
      ) : null}
      {photos.length > 0 ? (
        <>
          <p className="mb-1.5 text-xs font-semibold text-slate-950 dark:text-slate-400">{label}</p>
          <div className="flex gap-2">
            {photos.map((photo) => (
              <a
                key={photo.id}
                href={photo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-xl ring-2 ring-slate-200 dark:ring-slate-700"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="h-20 w-20 object-cover" />
              </a>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
