'use client'

import MemberTodayXpRow from './MemberTodayXpRow'
import { useFamily } from './FamilyProvider'
import { formatParentDisplayName } from '../lib/family/familyDisplayName'
import { resolveChildAvatar, resolveParentAvatar } from '../lib/family/memberAvatar'
import { cetFormatLongDateDe, cetToday } from '../lib/cetDate'
import { CARD_SURFACE_CLASS } from '../lib/appShell'

export default function FamilyTodayXpBoard() {
  const { parents, children, loading } = useFamily()
  const todayLabel = cetFormatLongDateDe(cetToday())

  if (loading) {
    return <p className="text-sm text-slate-600 dark:text-slate-400">Tages-XP wird geladen …</p>
  }

  const members = [
    ...parents.map((parent) => {
      const avatar = resolveParentAvatar(parent.gender, parent.avatar_url)
      return {
        key: `p-${parent.id}`,
        name: formatParentDisplayName(parent.display_name, parent.gender),
        todayXp: parent.todayXp,
        avatarSrc: avatar.src,
        avatarError: avatar.error,
      }
    }),
    ...children.map((child) => {
      const avatar = resolveChildAvatar(child.gender, child.age, child.portrait_id)
      return {
        key: `c-${child.id}`,
        name: child.display_name,
        todayXp: child.todayXp,
        avatarSrc: avatar.src,
        avatarError: avatar.error,
      }
    }),
  ]

  if (members.length === 0) {
    return <p className="text-sm text-slate-600 dark:text-slate-400">Noch keine Familienmitglieder.</p>
  }

  return (
    <section className={`${CARD_SURFACE_CLASS} space-y-3 rounded-2xl p-4`}>
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">XP heute</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">{todayLabel}</p>
      </div>
      <div className="space-y-3">
        {members.map((member) => (
          <MemberTodayXpRow
            key={member.key}
            name={member.name}
            todayXp={member.todayXp}
            avatarSrc={member.avatarSrc}
            avatarError={member.avatarError}
          />
        ))}
      </div>
    </section>
  )
}
