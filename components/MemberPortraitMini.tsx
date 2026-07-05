type MemberPortraitMiniProps = {
  src?: string | null
  error?: string | null
  className?: string
}

/** Kleinstes Portrait — z. B. Verlauf/Statistik (kleiner als Startseite & Admin). */
export default function MemberPortraitMini({ src, error, className = '' }: MemberPortraitMiniProps) {
  return (
    <div
      className={`relative aspect-[5/6] shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 ${
        className.includes('w-') ? '' : 'w-10'
      } ${className}`.trim()}
    >
      {error ? (
        <p className="flex h-full items-center justify-center px-0.5 text-center text-[7px] leading-tight text-amber-800 dark:text-amber-200">
          !
        </p>
      ) : src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
      ) : (
        <span className="flex h-full items-center justify-center text-[8px] text-slate-950 dark:text-slate-400">—</span>
      )}
    </div>
  )
}
