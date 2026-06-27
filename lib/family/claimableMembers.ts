import type { ChildGender, ParentGender } from './memberGender'

/** Noch kein Gerät verbunden — Admin hat Profil angelegt, Beitritt über Einladung offen. */
export function isMemberClaimable(input: { app_installed: boolean; rec_code_ok: boolean }): boolean {
  return !input.app_installed && !input.rec_code_ok
}

export type ClaimableMember = {
  memberKind: 'parent' | 'child'
  memberId: string
  displayName: string
  gender: ParentGender | ChildGender
  avatarSrc: string | null
  avatarError: string | null
}

export type ClaimMemberInput = {
  memberKind: 'parent' | 'child'
  memberId: string
}
