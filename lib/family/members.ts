import { supabase } from '../supabase'
import { mapParentProfileRow } from './mapParentProfile'
import type { FamilyMemberRole, ParentProfile } from './types'

export type ParentMember = ParentProfile & {
  role: FamilyMemberRole
  todayXp: number
}

export function isAdminRole(role: FamilyMemberRole | null | undefined): boolean {
  return role === 'owner' || role === 'parent'
}

export async function fetchParentsForFamily(
  familyId: string,
): Promise<{ parents: ParentMember[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('family_members')
    .select('role, parent_profiles(id, display_name, gender, can_admin, avatar_url, created_at, updated_at)')
    .eq('family_id', familyId)
    .in('role', ['owner', 'parent'])

  if (error) return { parents: [], error: new Error(error.message) }

  const parents: ParentMember[] = []
  for (const row of data ?? []) {
    const raw = row.parent_profiles as ParentProfile | ParentProfile[] | Record<string, unknown> | null
    const profileRow = Array.isArray(raw) ? raw[0] : raw
    const profile = profileRow ? mapParentProfileRow(profileRow as Record<string, unknown>) : null
    if (!profile?.id) continue
    parents.push({
      ...profile,
      role: row.role as FamilyMemberRole,
      todayXp: 0,
    })
  }

  return { parents, error: null }
}

export async function fetchMemberRoleForParent(
  familyId: string,
  parentId: string,
): Promise<{ role: FamilyMemberRole | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('family_members')
    .select('role')
    .eq('family_id', familyId)
    .eq('parent_id', parentId)
    .maybeSingle()

  if (error) return { role: null, error: new Error(error.message) }
  return { role: (data?.role as FamilyMemberRole | undefined) ?? null, error: null }
}
