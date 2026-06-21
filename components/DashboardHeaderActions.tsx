import HeaderActionPill from './HeaderActionPill'
import ThemeToggle from './ThemeToggle'
import { setupGuideTargetAttr } from '../lib/family/setupGuide'
import { setupGuideHighlightClass } from './FamilySetupGuideBubble'

type DashboardHeaderActionsProps = {
  showAdmin?: boolean
  preview?: boolean
  highlightAdmin?: boolean
}

export default function DashboardHeaderActions({
  showAdmin = false,
  preview = false,
  highlightAdmin = false,
}: DashboardHeaderActionsProps) {
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <ThemeToggle />
      {showAdmin ? (
        <HeaderActionPill
          label="Admin"
          href="/admin"
          preview={preview}
          setupGuideTarget={setupGuideTargetAttr('admin')}
          highlightClass={setupGuideHighlightClass(highlightAdmin)}
        />
      ) : null}
    </div>
  )
}
