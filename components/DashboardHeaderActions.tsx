import type { ReactNode } from 'react'

import FlowHintArrow from './FlowHintArrow'
import HeaderActionPill from './HeaderActionPill'
import ThemeToggle from './ThemeToggle'
import { setupGuideTargetAttr } from '../lib/family/setupGuide'
import { setupGuideHighlightClass } from './FamilySetupGuideBubble'

type DashboardHeaderActionsProps = {
  showAdmin?: boolean
  preview?: boolean
  highlightAdmin?: boolean
  onAdminNavigate?: () => void
  headerPlusAction?: ReactNode
}

export default function DashboardHeaderActions({
  showAdmin = false,
  preview = false,
  highlightAdmin = false,
  onAdminNavigate,
  headerPlusAction,
}: DashboardHeaderActionsProps) {
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div
        className={`flex items-center gap-2 ${preview ? 'pointer-events-auto' : ''}`}
        onClick={preview ? (event) => event.stopPropagation() : undefined}
        onKeyDown={preview ? (event) => event.stopPropagation() : undefined}
      >
        {headerPlusAction}
        <ThemeToggle />
      </div>
      {showAdmin ? (
        <div className="flex items-center gap-1">
          {highlightAdmin ? (
            <FlowHintArrow direction="right" className="w-auto shrink-0 py-0" />
          ) : null}
          <HeaderActionPill
            label="Admin"
            href="/admin"
            preview={preview}
            setupGuideTarget={setupGuideTargetAttr('admin')}
            highlightClass={setupGuideHighlightClass(highlightAdmin)}
            onNavigate={onAdminNavigate}
          />
        </div>
      ) : null}
    </div>
  )
}
