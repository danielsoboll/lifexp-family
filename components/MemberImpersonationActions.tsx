'use client'

import { useRouter } from 'next/navigation'

import { useFamily } from './FamilyProvider'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type MemberImpersonationActionsProps = {
  memberKind: 'parent' | 'child'
  memberId: string
  memberDisplayName: string
  childNoOwnDevice?: boolean
}

export default function MemberImpersonationActions({
  memberKind,
  memberId,
  memberDisplayName,
  childNoOwnDevice = false,
}: MemberImpersonationActionsProps) {
  const router = useRouter()
  const {
    canAdmin,
    memberKind: sessionKind,
    startChildImpersonation,
    endChildImpersonation,
    impersonationParentLabel,
    impersonationParentId,
    isImpersonatingChild,
  } = useFamily()

  const showLoginAsChild =
    canAdmin &&
    sessionKind === 'parent' &&
    memberKind === 'child' &&
    childNoOwnDevice &&
    !isImpersonatingChild

  const showReturnToParent =
    isImpersonatingChild &&
    memberKind === 'parent' &&
    impersonationParentId === memberId &&
    impersonationParentLabel !== null

  if (!showLoginAsChild && !showReturnToParent) return null

  const childName = memberDisplayName.trim() || 'Kind'
  const parentLabel = impersonationParentLabel ?? 'Elternteil'

  return (
    <section className="pt-1">
      {showLoginAsChild ? (
        <button
          type="button"
          onClick={() => {
            startChildImpersonation(memberId)
            router.push(`/children/${memberId}`)
          }}
          className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-sky-500 bg-gradient-to-b from-sky-50 via-sky-100 to-sky-200/90 px-4 py-3 text-sm font-bold text-sky-950 dark:border-sky-600 dark:from-sky-950/50 dark:via-sky-900/60 dark:to-sky-950 dark:text-sky-100`}
        >
          als {childName} einloggen
        </button>
      ) : null}
      {showReturnToParent ? (
        <button
          type="button"
          onClick={() => {
            const parentId = endChildImpersonation()
            if (parentId) router.push(`/parents/${parentId}`)
          }}
          className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 px-4 py-3 text-sm font-bold text-stone-900 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-stone-100`}
        >
          wieder als {parentLabel} einloggen
        </button>
      ) : null}
    </section>
  )
}
