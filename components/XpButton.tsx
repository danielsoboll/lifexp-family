type XpButtonProps = {
  label: string
  emoji: string
  xp: number
  onClick: () => void
}

export default function XpButton({ label, emoji, xp, onClick }: XpButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="lifexp-pressable-3d flex w-full items-center gap-3 rounded-2xl border-2 border-stone-700 bg-gradient-to-b from-stone-600 via-stone-800 to-stone-950 px-4 py-4 text-left text-stone-50 ring-1 ring-stone-500/30 hover:border-emerald-600/80 hover:from-stone-500 hover:via-stone-700 hover:to-stone-900 hover:ring-emerald-400/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 dark:border-stone-600 dark:from-stone-700 dark:via-stone-900 dark:to-stone-950 dark:ring-stone-600/40"
    >
      <span className="text-2xl" aria-hidden>
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold">{label}</span>
        <span className="text-sm font-medium text-emerald-300/95 dark:text-emerald-400/95">+{xp} XP</span>
      </span>
    </button>
  )
}
