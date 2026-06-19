const XP_PER_LEVEL = 500

export function getLevel(points: number) {
  return Math.floor(points / XP_PER_LEVEL) + 1
}

export function getProgress(points: number) {
  return points % XP_PER_LEVEL
}

export function getProgressPercent(points: number) {
  return (getProgress(points) / XP_PER_LEVEL) * 100
}

/** Fehlende XP bis zum nächsten Level. */
export function getXpRemainingToNextLevel(points: number) {
  const progress = getProgress(points)
  return progress === 0 ? XP_PER_LEVEL : XP_PER_LEVEL - progress
}
