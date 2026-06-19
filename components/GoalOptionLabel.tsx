import type { GoalOption } from '../lib/goals'

type GoalOptionLabelProps = {
  option: GoalOption
  /** inline: beide Symbole vor dem Text; flanked: je eins vor und hinter; stacked: Symbole über dem Text. */
  layout?: 'stacked' | 'inline' | 'flanked'
}

export default function GoalOptionLabel({ option, layout = 'inline' }: GoalOptionLabelProps) {
  const symbols = option.emojis.filter(Boolean).join(' ')

  if (layout === 'stacked') {
    return (
      <span className="flex flex-col items-center justify-center gap-1.5">
        <span className="text-xl leading-none" aria-hidden>
          {symbols}
        </span>
        <span className="leading-snug">{option.label}</span>
      </span>
    )
  }

  if (layout === 'flanked') {
    const [leading, trailing] = option.emojis
    return (
      <span className="flex w-full items-center gap-2">
        <span className="w-6 shrink-0 text-center text-base leading-none" aria-hidden>
          {leading}
        </span>
        <span className="min-w-0 flex-1 text-center leading-snug">{option.label}</span>
        <span className="w-6 shrink-0 text-center text-base leading-none" aria-hidden>
          {trailing ?? ''}
        </span>
      </span>
    )
  }

  return (
    <span className="flex items-center justify-center gap-2">
      <span className="shrink-0 text-lg leading-none" aria-hidden>
        {symbols}
      </span>
      <span className="leading-snug">{option.label}</span>
    </span>
  )
}
