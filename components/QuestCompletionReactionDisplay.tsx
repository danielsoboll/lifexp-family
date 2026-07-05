'use client'

import type { QuestCompletionCreatorReaction } from '../lib/family/questCompletionPlus'
import RoundPortraitReaction from './RoundPortraitReaction'

type QuestCompletionReactionDisplayProps = {
  reaction: QuestCompletionCreatorReaction
}

export default function QuestCompletionReactionDisplay({ reaction }: QuestCompletionReactionDisplayProps) {
  return (
    <div className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-emerald-300/70 bg-white/90 px-2.5 py-2 dark:border-emerald-800/60 dark:bg-slate-900/70">
      <RoundPortraitReaction portraitId={reaction.portraitId} sizeClass="h-11 w-11" />
      <p className="min-w-0 flex-1 pt-1 text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">
        {reaction.message}
      </p>
    </div>
  )
}
