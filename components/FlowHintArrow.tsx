/** Pulsierender Pfeil ohne Beschriftung (Streak-Hinweise, Ziele). */
export default function FlowHintArrow({ className = '' }: { className?: string }) {
  return (
    <div
      className={`lifexp-streak-hint flex w-full justify-center py-0.5 ${className}`.trim()}
      aria-hidden
    >
      <span className="text-xl leading-none text-yellow-500 dark:text-yellow-300">↓</span>
    </div>
  )
}
