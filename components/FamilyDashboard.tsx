'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'

import { notifyFamilyDataChanged, useFamily, FAMILY_DATA_CHANGED_EVENT } from './FamilyProvider'
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
import {
  isMemberStreakIntroSeen,
  MEMBER_STREAK_INTRO_CHANGED_EVENT,
  persistMemberStreakIntroSeen,
} from '../lib/family/streakIntroHint'
import { firstOtherMemberHref, markSetupGuideAdminVisited, setupGuideTargetAttr } from '../lib/family/setupGuide'
import {
  ONBOARDING_PREVIEW_FAMILY_SET_1,
  ONBOARDING_PREVIEW_FAMILY_SET_2,
  ONBOARDING_PREVIEW_FAMILY_1_INTRO_MS,
  ONBOARDING_PREVIEW_SCROLL_MS,
} from '../lib/family/onboardingPreviewFamily'
import { ONBOARDING_PREVIEW_STEP_MS, previewMemberTodayXp, sumPreviewFamilyTodayXp } from '../lib/family/onboardingPreviewXpTimeline'
import { cetFormatLongDateDe, cetToday } from '../lib/cetDate'
import { HOME_PAGE_INSET_CLASS, MAIN_SHELL_CLASS } from '../lib/appShell'
import { slowScrollContainerToElement, slowScrollToElement, slowScrollToRevealElement } from '../lib/slowScroll'
import { useSetupGuide, isSetupGuideTargetActive } from '../hooks/useSetupGuide'
import { useOnboardingPreviewXpStep } from '../hooks/useOnboardingPreviewXpStep'

type FamilyDashboardProps = {
  preview?: boolean
  previewScrollContainerRef?: RefObject<HTMLElement | null>
  previewAlternate?: boolean
}

export default function FamilyDashboard({
  preview = false,
  previewScrollContainerRef,
  previewAlternate = false,
}: FamilyDashboardProps) {
  const previewParentsRef = useRef<HTMLDivElement>(null)
  const familyCtx = useFamily()

  const family = preview ? null : familyCtx.family
  const parents = preview ? [] : familyCtx.parents
  const children = preview ? [] : familyCtx.children
  const loading = preview ? false : familyCtx.loading
  const error = preview ? null : familyCtx.error
  const canAdmin = preview ? false : familyCtx.canAdmin
  const memberKind = preview ? null : familyCtx.memberKind
  const session = preview ? null : familyCtx.session
  const parent = preview ? null : familyCtx.parent
  const activeChild = preview ? null : familyCtx.activeChild

  const todayLabel = cetFormatLongDateDe(cetToday())
  const familyHeading = preview ? formatFamilyHeading('Miteinander') : formatFamilyHeading(family?.name)

  const previewXpStep = useOnboardingPreviewXpStep(preview, previewAlternate)
  const previewFamily = previewAlternate ? ONBOARDING_PREVIEW_FAMILY_SET_2 : ONBOARDING_PREVIEW_FAMILY_SET_1

  const previewTodayXp = useCallback(
    (memberId: string, fallback: number) =>
      preview ? (previewMemberTodayXp(memberId, previewXpStep, previewAlternate) ?? fallback) : fallback,
    [preview, previewXpStep, previewAlternate],
  )

  const parentRows = preview ? previewFamily.parents : parents
  const childRows = preview ? previewFamily.children : children
  const familyTodayXp = preview
    ? sumPreviewFamilyTodayXp(previewXpStep, previewAlternate)
    : sumFamilyTodayXp(parentRows, childRows)
  const showHappyAll =
    !loading && (preview || familyReachedHappyAllToday(parentRows, childRows))

  const guide = useSetupGuide({
    family,
    parentCount: parentRows.length,
    childCount: childRows.length,
    canAdmin,
  })

  const [sessionStreakClaimed, setSessionStreakClaimed] = useState<boolean | null>(null)
  const [streakIntroTick, setStreakIntroTick] = useState(0)

  useEffect(() => {
    const onStreakIntroChanged = () => setStreakIntroTick((n) => n + 1)
    window.addEventListener(MEMBER_STREAK_INTRO_CHANGED_EVENT, onStreakIntroChanged)
    return () => window.removeEventListener(MEMBER_STREAK_INTRO_CHANGED_EVENT, onStreakIntroChanged)
  }, [])

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

  const streakIntroSeen = useMemo(() => {
    if (memberKind === 'parent' && parent) {
      return isMemberStreakIntroSeen({
        memberKind: 'parent',
        memberId: parent.id,
        dbSeen: parent.streak_intro_seen,
      })
    }
    if (memberKind === 'child' && activeChild) {
      return isMemberStreakIntroSeen({
        memberKind: 'child',
        memberId: activeChild.id,
        dbSeen: activeChild.streak_intro_seen,
      })
    }
    return true
  }, [memberKind, parent, activeChild, streakIntroTick])

  const showSetupGuide = Boolean(!preview && guide.visible && guide.copy)
  const showStreakProfileHint =
    !preview && sessionStreakClaimed === false && !streakIntroSeen && !showSetupGuide

  const dismissStreakHint = () => {
    if (!session) return
    const dbSeen =
      session.memberKind === 'parent'
        ? parent?.streak_intro_seen === true
        : activeChild?.streak_intro_seen === true
    void persistMemberStreakIntroSeen({
      memberKind: session.memberKind,
      memberId: session.memberId,
      dbSeen,
    }).then(() => notifyFamilyDataChanged())
  }

  const handleOwnProfileNavigate = useCallback(() => {
    if (!session || preview) return
    const dbSeen =
      session.memberKind === 'parent'
        ? parent?.streak_intro_seen === true
        : activeChild?.streak_intro_seen === true
    void persistMemberStreakIntroSeen({
      memberKind: session.memberKind,
      memberId: session.memberId,
      dbSeen,
    }).then(() => notifyFamilyDataChanged())
  }, [session, preview, parent?.streak_intro_seen, activeChild?.streak_intro_seen])

  const handleAdminNavigate = useCallback(() => {
    if (!family || preview) return
    void markSetupGuideAdminVisited(family)
  }, [family, preview])

  useEffect(() => {
    if (!showSetupGuide) return

    let cancelled = false
    const scrollToGuideTarget = () => {
      if (cancelled) return

      if (guide.step === 'first_quest') {
        const el = document.querySelector(`[data-setup-guide-target="${setupGuideTargetAttr('new_quest')}"]`)
        if (el instanceof HTMLElement) {
          slowScrollToRevealElement(el, { durationMs: 2000, bottomInsetPx: 140 })
        }
        return
      }

      if (guide.step === 'invite_code') {
        const el = document.querySelector(`[data-setup-guide-target="${setupGuideTargetAttr('admin')}"]`)
        if (el instanceof HTMLElement) {
          slowScrollToElement(el, { durationMs: 2000, viewportAnchor: 0.2 })
        }
      }
    }

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToGuideTarget)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [showSetupGuide, guide.step])

  useEffect(() => {
    if (!preview) return
    const container = previewScrollContainerRef?.current
    const parentsEl = previewParentsRef.current
    if (!container || !parentsEl) return

    const scrollDelayMs = previewAlternate ? ONBOARDING_PREVIEW_STEP_MS : ONBOARDING_PREVIEW_FAMILY_1_INTRO_MS
    const timer = window.setTimeout(() => {
      void slowScrollContainerToElement(container, parentsEl, {
        topInsetPx: 12,
        durationMs: ONBOARDING_PREVIEW_SCROLL_MS,
      })
    }, scrollDelayMs)

    return () => window.clearTimeout(timer)
  }, [preview, previewAlternate, previewScrollContainerRef])

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

  const memberOwnProfileNavigate = (type: 'parent' | 'child', id: string) =>
    showStreakProfileHint && ownMemberTargetId === `${type}:${id}` ? handleOwnProfileNavigate : undefined

  const memberSetupGuideTarget = (type: 'parent' | 'child', id: string) => {
    const key = `${type}:${id}`
    if (showSetupGuide && firstMemberTargetId === key && isSetupGuideTargetActive(guide.activeTarget, 'first_member')) {
      return setupGuideTargetAttr('first_member')
    }
    if (showStreakProfileHint && ownMemberTargetId === key) {
      return setupGuideTargetAttr('own_profile')
    }
    return undefined
  }

  const renderMemberHighlight = (type: 'parent' | 'child', id: string) => {
    const key = `${type}:${id}`
    const targetActive = isSetupGuideTargetActive(guide.activeTarget, 'first_member')
    if (showSetupGuide && targetActive && firstMemberTargetId === key) {
      return setupGuideHighlightClass(true)
    }
    if (showStreakProfileHint && ownMemberTargetId === key) {
      return setupGuideHighlightClass(true)
    }
    return ''
  }

  return (
    <main className={`${MAIN_SHELL_CLASS} ${HOME_PAGE_INSET_CLASS} mx-auto flex w-full max-w-lg flex-col gap-6 px-4`}>
      {showHappyAll ? (
        <FamilyHappyAllBanner
          familyTodayXp={familyTodayXp}
          cycleImages={preview}
          showAlternate={previewAlternate}
          previewXpStep={preview ? previewXpStep : undefined}
        />
      ) : null}

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <LifeXpBrandMark showFamilySuffix />
          <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">{familyHeading}</h2>
          <p className="mt-1 text-sm text-slate-950 dark:text-slate-400">{todayLabel}</p>
        </div>
        <DashboardHeaderActions
          showAdmin={canAdmin}
          preview={preview}
          highlightAdmin={showSetupGuide && isSetupGuideTargetActive(guide.activeTarget, 'admin')}
          onAdminNavigate={handleAdminNavigate}
        />
      </header>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-950 dark:text-slate-400">Wird geladen …</p>
      ) : (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Familienmitglieder</h2>
          <div ref={preview ? previewParentsRef : undefined} className="grid grid-cols-2 gap-3">
            {parentRows.map((parent) => {
              const todayXp = previewTodayXp(parent.id, parent.todayXp ?? 0)
              const avatar = resolveParentAvatar(parent.gender, parent.avatar_url, { todayXp })
              return (
                <MemberSlot
                  key={parent.id}
                  name={formatParentDisplayName(parent.display_name, parent.gender)}
                  todayXp={todayXp}
                  avatarSrc={avatar.src}
                  avatarError={avatar.error}
                  href={preview ? undefined : `/parents/${parent.id}`}
                  preview={preview}
                  highlightClass={renderMemberHighlight('parent', parent.id)}
                  setupGuideTarget={memberSetupGuideTarget('parent', parent.id)}
                  onNavigate={memberOwnProfileNavigate('parent', parent.id)}
                />
              )
            })}
          </div>
          {childRows.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {childRows.map((child) => {
                const todayXp = previewTodayXp(child.id, child.todayXp)
                const avatar = resolveChildAvatar(child.gender, child.age, child.portrait_id, { todayXp })
                const memberKey = preview ? `${child.id}-${previewXpStep}-${avatar.portraitId}` : child.id
                return (
                  <div
                    key={memberKey}
                    {...(preview && child.id === 'c3' ? { 'data-onboarding-preview-fritz': '' } : {})}
                  >
                    <MemberSlot
                      name={child.display_name}
                      todayXp={todayXp}
                      avatarSrc={avatar.src}
                      avatarError={avatar.error}
                      href={preview ? undefined : `/children/${child.id}`}
                      preview={preview}
                      highlightClass={renderMemberHighlight('child', child.id)}
                      setupGuideTarget={memberSetupGuideTarget('child', child.id)}
                      onNavigate={memberOwnProfileNavigate('child', child.id)}
                    />
                  </div>
                )
              })}
            </div>
          ) : !preview ? (
            <p className="text-sm font-medium text-slate-950 dark:text-slate-300">
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

      {showSetupGuide ? (
        <FamilySetupGuideBubble
          title={guide.copy!.title}
          body={guide.copy!.body}
          target={guide.copy!.target}
          showArrow={guide.step !== 'complete'}
          onDismiss={guide.dismiss}
        />
      ) : null}

      {showStreakProfileHint ? (
        <FamilySetupGuideBubble
          title="Streak"
          body="Tippe auf dein Profilbild — dort kannst du „Heute dabei“ bestätigen und +2 XP sammeln"
          target="own_profile"
          showArrow
          showBrandMark={false}
          onDismiss={dismissStreakHint}
        />
      ) : null}
    </main>
  )
}
