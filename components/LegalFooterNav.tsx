import Link from 'next/link'

const linkClass =
  'inline-flex min-h-11 items-center px-1 text-xs font-medium leading-none text-slate-950 underline-offset-2 hover:underline dark:text-slate-400 dark:hover:text-slate-300'

const separatorClass = 'text-xs text-slate-500 dark:text-slate-600'

type LegalFooterNavProps = {
  className?: string
}

export default function LegalFooterNav({ className = '' }: LegalFooterNavProps) {
  return (
    <nav
      className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center ${className}`}
      aria-label="Rechtliches"
    >
      <Link href="/impressum" className={linkClass}>
        Impressum
      </Link>
      <span className={separatorClass} aria-hidden>
        |
      </span>
      <Link href="/datenschutz" className={linkClass}>
        Datenschutz
      </Link>
      <span className={separatorClass} aria-hidden>
        |
      </span>
      <Link href="/haftung" className={linkClass}>
        Haftung
      </Link>
      <span className={separatorClass} aria-hidden>
        |
      </span>
      <Link href="/agb" className={linkClass}>
        AGB
      </Link>
    </nav>
  )
}
