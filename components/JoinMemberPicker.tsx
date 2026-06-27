'use client'

import MemberPortraitThumb from './MemberPortraitThumb'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'
import type { ClaimableMember } from '../lib/family/claimableMembers'

type JoinMemberPickerProps = {
  members: ClaimableMember[]
  onSelect: (member: ClaimableMember) => void
  disabled?: boolean
}

export default function JoinMemberPicker({ members, onSelect, disabled = false }: JoinMemberPickerProps) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-slate-950 dark:text-slate-400">
        Keine offenen Familienprofile — bitte den Einladungscode prüfen oder den Familiengründer fragen.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Wer bist du?</p>
      <div className="grid grid-cols-2 gap-2">
        {members.map((member) => (
          <button
            key={`${member.memberKind}:${member.memberId}`}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(member)}
            className={`${PRESSABLE_3D_CLASS} flex flex-col items-center gap-2 rounded-xl border-2 border-slate-300 bg-white/90 px-2 py-3 text-center dark:border-slate-600 dark:bg-slate-900/60 disabled:opacity-50`}
          >
            <MemberPortraitThumb
              src={member.avatarSrc}
              error={member.avatarError}
              className="!w-[4.75rem] sm:!w-[5.25rem]"
            />
            <span className="line-clamp-2 text-sm font-bold leading-tight text-slate-900 dark:text-slate-100">
              {member.displayName}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
