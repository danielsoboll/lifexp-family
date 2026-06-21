type FlowHintArrowProps = {
  className?: string
  /** Richtung, in die der Pfeil auf das Ziel zeigt. */
  direction?: 'down' | 'up' | 'left' | 'right' | 'above' | 'below'
}

const ARROW_GLYPH: Record<'down' | 'up' | 'left' | 'right', string> = {
  down: '↓',
  up: '↑',
  left: '←',
  right: '→',
}

function normalizeDirection(
  direction: FlowHintArrowProps['direction'],
): 'down' | 'up' | 'left' | 'right' {
  switch (direction) {
    case 'up':
    case 'above':
      return 'up'
    case 'left':
      return 'left'
    case 'right':
      return 'right'
    case 'down':
    case 'below':
    default:
      return 'down'
  }
}

/** Pulsierender Pfeil ohne Beschriftung (Assistent, Streak-Hinweise). */
export default function FlowHintArrow({ className = '', direction = 'down' }: FlowHintArrowProps) {
  const glyph = ARROW_GLYPH[normalizeDirection(direction)]

  return (
    <div
      className={`lifexp-streak-hint flex justify-center py-0.5 ${className}`.trim()}
      aria-hidden
    >
      <span className="text-xl leading-none text-yellow-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] dark:text-yellow-300">
        {glyph}
      </span>
    </div>
  )
}
