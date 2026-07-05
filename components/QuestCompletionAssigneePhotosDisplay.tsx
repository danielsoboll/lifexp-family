'use client'

import type { QuestCompletionPhoto } from '../lib/family/questCompletionPlus'

type QuestCompletionAssigneePhotosDisplayProps = {
  photos: readonly QuestCompletionPhoto[]
  label?: string
}

export default function QuestCompletionAssigneePhotosDisplay({
  photos,
  label = 'Deine Fotos',
}: QuestCompletionAssigneePhotosDisplayProps) {
  if (photos.length === 0) return null

  return (
    <div className="mt-2.5">
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
    </div>
  )
}
