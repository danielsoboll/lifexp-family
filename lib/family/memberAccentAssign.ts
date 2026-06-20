import { fetchChildrenForFamily } from './children'
import { fetchParentsForFamily } from './members'
import { pickNextMemberAccentKey, type MemberAccentKey } from './memberAccentColor'

export async function nextAccentKeyForFamily(familyId: string): Promise<{ accentKey: MemberAccentKey; error: Error | null }> {
  const [{ parents, error: parentError }, { children, error: childError }] = await Promise.all([
    fetchParentsForFamily(familyId),
    fetchChildrenForFamily(familyId),
  ])

  if (parentError) return { accentKey: 'amber', error: parentError }
  if (childError) return { accentKey: 'amber', error: childError }

  const used = [...parents.map((p) => p.accent_key), ...children.map((c) => c.accent_key)]
  return { accentKey: pickNextMemberAccentKey(used), error: null }
}
