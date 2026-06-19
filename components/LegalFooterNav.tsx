import Link from 'next/link'

const linkClass =
  'text-[0.6875rem] leading-none text-white/78 underline-offset-2 hover:text-white/95 hover:underline dark:text-slate-500 dark:hover:text-slate-300'

const separatorClass = 'text-[0.6875rem] text-white/55 dark:text-slate-600'

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
    </nav>
  )
}
