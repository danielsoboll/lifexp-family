'use client'

import { useEffect, useMemo, useState } from 'react'

import { useFamily, FAMILY_DATA_CHANGED_EVENT } from './FamilyProvider'
import DashboardButton from './DashboardButton'
import DashboardHeaderActions from './DashboardHeaderActions'
import FamilySetupGuideBubble, { setupGuideHighlightClass } from './FamilySetupGuideBubble'
import LegalFooterNav from './LegalFooterNav'
import FamilyHappyAllBanner from './FamilyHappyAllBanner'
import LifeXpBrandMark from './LifeXpBrandMark'
import MemberSlot from './MemberSlot'
import {
  resolveChildAvatar,
  resolveParentAvatar,
} from '../lib/family/memberAvatar'
import { formatFamilyHeading, formatParentDisplayName } from '../lib/family/familyDisplayName'
import {
  familyReachedHappyAllToday,
  sumFamilyTodayXp,
} from '../lib/family/dailyXpDisplay'
import { fetchMemberStreakClaimedToday } from '../lib/family/dailyStreak'
import { firstOtherMemberHref, setupGuideTargetAttr } from '../lib/family/setupGuide'
import { cetFormatLongDateDe, cetToday } from '../lib/cetDate'
import { HOME_PAGE_INSET_CLASS, MAIN_SHELL_CLASS } from '../lib/appShell'
import { useSetupGuide, isSetupGuideTargetActive } from '../hooks/useSetupGuide'

type FamilyDashboardProps = {
  preview?: boolean
}

export default function FamilyDashboard({ preview = false }: FamilyDashboardProps) {
  const familyCtx = useFamily()

  const family = preview ? null : familyCtx.family
  const parents = preview ? [] : familyCtx.parents
  const children = preview ? [] : familyCtx.children
  const loading = preview ? false : familyCtx.loading
  const error = preview ? null : familyCtx.error
  const canAdmin = preview ? false : familyCtx.canAdmin
  const memberKind = preview ? null : familyCtx.memberKind
  const session = preview ? null : familyCtx.session

  const [streakClaimed, setStreakClaimed] = useState<boolean | null>(null)

  const todayLabel = cetFormatLongDateDe(cetToday())
  const familyHeading = preview ? formatFamilyHeading('Sonnenschein') : formatFamilyHeading(family?.name)

  const previewParents = [
    { id: 'p1', display_name: 'Daniel', gender: 'male' as const, role: 'parent' as const, can_admin: true, todayXp: 22, avatar_url: '/avatars/Mann_1_1.webp', accent_key: 'rose', rec_code: null, rec_code_ok: false, app_installed: false, app_later: false, created_at: '', updated_at: '' },
    { id: 'p2', display_name: 'Anna', gender: 'female' as const, role: 'parent' as const, can_admin: true, todayXp: 16, avatar_url: '/avatars/Frau_1_1.webp', accent_key: 'amber', rec_code: null, rec_code_ok: false, app_installed: false, app_later: false, created_at: '', updated_at: '' },
  ]
  const previewChildren = [
    {
      id: 'c1',
      display_name: 'Kind 1',
      gender: 'boy' as const,
      age: 8,
      can_admin: false,
      todayXp: 14,
      family_id: '',
      portrait_id: 'Junge_2_1',
      total_xp: 0,
      level: 1,
      is_active: true,
      sort_order: 0,
      notes: null,
      accent_key: 'sky',
      rec_code: null,
      rec_code_ok: false,
      app_installed: false,
      app_later: false,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'c2',
      display_name: 'Kind 2',
      gender: 'girl' as const,
      age: 10,
      can_admin: false,
      todayXp: 14,
      family_id: '',
      portrait_id: 'Mädchen_1_1',
      total_xp: 0,
      level: 1,
      is_active: true,
      sort_order: 0,
      notes: null,
      accent_key: 'sky',
      rec_code: null,
      rec_code_ok: false,
      app_installed: false,
      app_later: false,
      created_at: '',
      updated_at: '',
    },
  ]

  const parentRows = preview ? previewParents : parents
  const childRows = preview ? previewChildren : children
  const familyTodayXp = sumFamilyTodayXp(parentRows, childRows)
  const showHappyAll = !loading && familyReachedHappyAllToday(parentRows, childRows)

  const guide = useSetupGuide({
    familyId: family?.id,
    parentCount: parentRows.length,
    childCount: childRows.length,
    canAdmin,
  })

  const [sessionStreakClaimed, setSessionStreakClaimed] = useState<boolean | null>(null)
  const [streakHintDismissed, setStreakHintDismissed] = useState(false)

  useEffect(() => {
    if (preview || !family || !session) {
      setSessionStreakClaimed(null)
      return
    }
    let cancelled = false
    const loadStreak = async () => {
      const { claimed } = await fetchMemberStreakClaimedToday({
        familyId: family.id,
        memberKind: session.memberKind,
        memberId: session.memberId,
      })
      if (!cancelled) {
        setSessionStreakClaimed(claimed)
        if (claimed) setStreakHintDismissed(false)
      }
    }
    void loadStreak()
    const onRefresh = () => void loadStreak()
    window.addEventListener(FAMILY_DATA_CHANGED_EVENT, onRefresh)
    return () => {
      cancelled = true
      window.removeEventListener(FAMILY_DATA_CHANGED_EVENT, onRefresh)
    }
  }, [preview, family, session])

  const ownMemberTargetId = useMemo(() => {
    if (!session) return null
    return `${session.memberKind}:${session.memberId}`
  }, [session])

  const showStreakProfileHint = !preview && sessionStreakClaimed === false && !streakHintDismissed
  const showSetupGuide = Boolean(!preview && guide.visible && guide.copy && sessionStreakClaimed === true)

  const firstMemberHref = useMemo(
    () =>
      firstOtherMemberHref({
        memberKind,
        memberId: session?.memberId ?? null,
        parents: parentRows,
        children: childRows,
      }),
    [memberKind, session?.memberId, parentRows, childRows],
  )

  const firstMemberTargetId = useMemo(() => {
    if (!firstMemberHref) return null
    const match = firstMemberHref.match(/\/(parents|children)\/([^/]+)/)
    return match ? `${match[1] === 'parents' ? 'parent' : 'child'}:${match[2]}` : null
  }, [firstMemberHref])

  const memberSetupGuideTarget = (type: 'parent' | 'child', id: string) => {
    const key = `${type}:${id}`
    if (showStreakProfileHint && ownMemberTargetId === key) {
      return setupGuideTargetAttr('own_profile')
    }
    if (showSetupGuide && firstMemberTargetId === key) {
      return setupGuideTargetAttr('first_member')
    }
    return undefined
  }

  const renderMemberHighlight = (type: 'parent' | 'child', id: string) => {
    const key = `${type}:${id}`
    if (showStreakProfileHint && ownMemberTargetId === key) {
      return setupGuideHighlightClass(true)
    }
    const targetActive = isSetupGuideTargetActive(guide.activeTarget, 'first_member')
    return setupGuideHighlightClass(showSetupGuide && targetActive && firstMemberTargetId === key)
  }

  return (
    <main className={`${MAIN_SHELL_CLASS} ${HOME_PAGE_INSET_CLASS} mx-auto flex w-full max-w-lg flex-col gap-6 px-4`}>
      {showHappyAll ? <FamilyHappyAllBanner familyTodayXp={familyTodayXp} /> : null}

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <LifeXpBrandMark showFamilySuffix />
          <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">{familyHeading}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{todayLabel}</p>
        </div>
        <DashboardHeaderActions
          showAdmin={canAdmin}
          preview={preview}
          highlightAdmin={showSetupGuide && isSetupGuideTargetActive(guide.activeTarget, 'admin')}
        />
      </header>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Wird geladen …</p>
      ) : (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Familienmitglieder</h2>
          <div className="grid grid-cols-2 gap-3">
            {parentRows.map((parent) => {
              const avatar = resolveParentAvatar(parent.gender, parent.avatar_url, {
                todayXp: parent.todayXp ?? 0,
              })
              return (
                <MemberSlot
                  key={parent.id}
                  name={formatParentDisplayName(parent.display_name, parent.gender)}
                  todayXp={parent.todayXp ?? 0}
                  avatarSrc={avatar.src}
                  avatarError={avatar.error}
                  href={preview ? undefined : `/parents/${parent.id}`}
                  preview={preview}
                  highlightClass={renderMemberHighlight('parent', parent.id)}
                  setupGuideTarget={memberSetupGuideTarget('parent', parent.id)}
                />
              )
            })}
          </div>
          {childRows.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {childRows.map((child) => {
                const avatar = resolveChildAvatar(child.gender, child.age, child.portrait_id, {
                  todayXp: child.todayXp,
                })
                return (
                  <MemberSlot
                    key={child.id}
                    name={child.display_name}
                    todayXp={child.todayXp}
                    avatarSrc={avatar.src}
                    avatarError={avatar.error}
                    href={preview ? undefined : `/children/${child.id}`}
                    preview={preview}
                    highlightClass={renderMemberHighlight('child', child.id)}
                    setupGuideTarget={memberSetupGuideTarget('child', child.id)}
                  />
                )
              })}
            </div>
          ) : !preview ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Noch keine weiteren Familienmitglieder — über Admin hinzufügen.
            </p>
          ) : null}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Aktionen</h2>
        <DashboardButton
          href="/quests"
          emoji="🎯"
          title="Family-Quests"
          subtitle="Alle Quests der Familie — heute und morgen"
          preview={preview}
        />
        <DashboardButton
          href="/quests/new"
          emoji="✨"
          title="Quest eintragen"
          subtitle="Aufgabe für jemand anderen — heute oder morgen"
          preview={preview}
          setupGuideTarget={setupGuideTargetAttr('new_quest')}
          highlightClass={setupGuideHighlightClass(showSetupGuide && isSetupGuideTargetActive(guide.activeTarget, 'new_quest'))}
        />
        <DashboardButton
          href="/verlauf"
          emoji="📜"
          title="Verlauf"
          subtitle="Tages-XP aller Mitglieder und Verlauf"
          preview={preview}
        />
      </section>

      {!preview ? <LegalFooterNav /> : null}

      {showStreakProfileHint ? (
        <FamilySetupGuideBubble
          title="Streak"
          body="Tippe auf dein Profilbild — dort kannst du „Heute dabei“ bestätigen und +2 XP sammeln."
          target="own_profile"
          showArrow
          onDismiss={() => setStreakHintDismissed(true)}
        />
      ) : null}

      {showSetupGuide ? (
        <FamilySetupGuideBubble
          title={guide.copy!.title}
          body={guide.copy!.body}
          target={guide.copy!.target}
          showArrow={guide.step !== 'complete'}
          onDismiss={guide.dismiss}
        />
      ) : null}
    </main>
  )
}
