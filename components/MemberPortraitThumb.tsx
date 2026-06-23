type MemberPortraitThumbProps = {
  src?: string | null
  error?: string | null
  className?: string
}

/** Kompaktes Portrait in Admin-Formularen — gleiches Seitenverhältnis wie MemberSlot. */
export default function MemberPortraitThumb({ src, error, className = '' }: MemberPortraitThumbProps) {
  return (
    <div
      className={`relative aspect-[5/6] w-[5.25rem] shrink-0 self-start overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 sm:w-[5.75rem] ${className}`.trim()}
    >
      {error ? (
        <p className="flex h-full items-center justify-center px-1 text-center text-[9px] leading-tight text-amber-800 dark:text-amber-200">
          {error}
        </p>
      ) : src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
      ) : (
        <span className="flex h-full items-center justify-center px-1 text-center text-[10px] text-slate-500 dark:text-slate-400">
          Kein Portrait
        </span>
      )}
    </div>
  )
}
