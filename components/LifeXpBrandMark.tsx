type LifeXpBrandMarkProps = {
  /** „ Family“ an den Markennamen anhängen */
  showFamilySuffix?: boolean
  className?: string
}

/** Markenzeile — kompakter als der Familienname in der Übersicht. */
export default function LifeXpBrandMark({ showFamilySuffix = false, className = '' }: LifeXpBrandMarkProps) {
  return (
    <h1
      className={`text-balance text-xl font-bold tracking-tight text-stone-50 dark:text-slate-400 ${className}`.trim()}
    >
      <span aria-hidden className="mr-1.5">
        🔥
      </span>
      LifeXP
      {showFamilySuffix ? ' Family' : null}
    </h1>
  )
}
