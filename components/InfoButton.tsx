import Link from 'next/link'

type InfoButtonProps = {
  href: string
  label: string
}

export default function InfoButton({ href, label }: InfoButtonProps) {
  return (
    <Link
      href={href}
      className="lifexp-pressable-3d flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-sky-300 bg-gradient-to-b from-sky-50 via-sky-100/95 to-blue-200/80 text-xl font-black text-sky-700 hover:border-sky-400 hover:from-sky-100 hover:via-sky-50 hover:to-blue-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:border-sky-500/70 dark:from-sky-900/80 dark:via-sky-950/60 dark:to-blue-950 dark:text-sky-100 dark:hover:border-sky-400 dark:hover:from-sky-800/90 dark:hover:via-sky-900/70 dark:hover:to-blue-900/85"
      aria-label={label}
      title={label}
    >
      i
    </Link>
  )
}
