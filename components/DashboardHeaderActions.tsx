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
}

export default function DashboardHeaderActions({
  showAdmin = false,
  preview = false,
  highlightAdmin = false,
  onAdminNavigate,
}: DashboardHeaderActionsProps) {
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div
        className={preview ? 'pointer-events-auto' : undefined}
        onClick={preview ? (event) => event.stopPropagation() : undefined}
        onKeyDown={preview ? (event) => event.stopPropagation() : undefined}
      >
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
