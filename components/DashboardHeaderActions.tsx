import HeaderActionPill from './HeaderActionPill'
import ThemeToggle from './ThemeToggle'

type DashboardHeaderActionsProps = {
  showAdmin?: boolean
  preview?: boolean
}

export default function DashboardHeaderActions({ showAdmin = false, preview = false }: DashboardHeaderActionsProps) {
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <ThemeToggle />
      {showAdmin ? <HeaderActionPill label="Admin" href="/admin" preview={preview} /> : null}
    </div>
  )
}
