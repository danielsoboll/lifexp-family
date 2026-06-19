import Link from 'next/link'

const pendingHighlightClass =
  'border-yellow-300 bg-gradient-to-b from-yellow-50 via-amber-50/95 to-yellow-200/80 text-amber-950 ring-1 ring-yellow-200/60 dark:border-yellow-700 dark:from-yellow-950/45 dark:via-amber-950/35 dark:to-yellow-900/55 dark:text-yellow-100 dark:ring-yellow-900/40'

const selectedClass =
  'border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200/80 dark:border-emerald-600 dark:bg-emerald-950/45 dark:text-emerald-100 dark:ring-emerald-800/60'

type TaskColorEigeneLinkProps = {
  hasCustomLabels: boolean
}

export default function TaskColorEigeneLink({ hasCustomLabels }: TaskColorEigeneLinkProps) {
  return (
    <Link
      href="/plus/aufgabenplaner/eigene"
      className={`lifexp-pressable-3d inline-flex items-center justify-center rounded-full border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wide ${
        hasCustomLabels ? selectedClass : pendingHighlightClass
      }`}
    >
      Eigene
    </Link>
  )
}
