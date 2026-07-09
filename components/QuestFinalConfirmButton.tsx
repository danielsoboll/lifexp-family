'use client'

import QuestCreatorConfirmBlock from './QuestCreatorConfirmBlock'

type QuestFinalConfirmButtonProps = {
  completionId: string
  xpReward: number
  assigneeName?: string
  assigneeChildId?: string | null
  assigneeParentId?: string | null
  compact?: boolean
  onConfirmed?: () => void
}

export default function QuestFinalConfirmButton(props: QuestFinalConfirmButtonProps) {
  return <QuestCreatorConfirmBlock {...props} />
}
