import { scopedLocalGet, scopedLocalRemove, scopedLocalSet } from '../scopedClientStorage'
import type { FamilySession } from '../familySession'

export const CHILD_IMPERSONATION_BACKUP_KEY = 'lifexp_child_impersonation_backup'

export type ChildImpersonationBackup = {
  parentSession: FamilySession
  parentDisplayName: string
}

function parseBackup(raw: string): ChildImpersonationBackup | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ChildImpersonationBackup>
    const parentSession = parsed.parentSession
    const parentDisplayName = typeof parsed.parentDisplayName === 'string' ? parsed.parentDisplayName.trim() : ''
    if (
      !parentSession ||
      typeof parentSession.familyId !== 'string' ||
      typeof parentSession.memberId !== 'string' ||
      (parentSession.memberKind !== 'parent' && parentSession.memberKind !== 'child') ||
      parentSession.memberKind !== 'parent' ||
      !parentDisplayName
    ) {
      return null
    }
    return {
      parentSession: {
        familyId: parentSession.familyId,
        memberId: parentSession.memberId,
        memberKind: 'parent',
      },
      parentDisplayName,
    }
  } catch {
    return null
  }
}

export function readChildImpersonationBackup(): ChildImpersonationBackup | null {
  const raw = scopedLocalGet(CHILD_IMPERSONATION_BACKUP_KEY)
  if (!raw) return null
  return parseBackup(raw)
}

export function storeChildImpersonationBackup(backup: ChildImpersonationBackup): void {
  scopedLocalSet(CHILD_IMPERSONATION_BACKUP_KEY, JSON.stringify(backup))
}

export function clearChildImpersonationBackup(): void {
  scopedLocalRemove(CHILD_IMPERSONATION_BACKUP_KEY)
}

export function isChildImpersonationActive(session: FamilySession | null): boolean {
  if (!session || session.memberKind !== 'child') return false
  const backup = readChildImpersonationBackup()
  return backup !== null && backup.parentSession.familyId === session.familyId
}
