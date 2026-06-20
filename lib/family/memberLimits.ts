/** Maximal aktive Kinder pro Familie. */
export const MAX_CHILDREN_PER_FAMILY = 6

export function isChildLimitReached(activeChildCount: number): boolean {
  return activeChildCount >= MAX_CHILDREN_PER_FAMILY
}
