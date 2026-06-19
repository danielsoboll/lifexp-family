'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import AvatarPicture from './AvatarPicture'
import {
  AVATAR_FRAME_HOME_MAX_PX,
  AVATAR_LEVEL1_MILESTONE_COPY_MIN_DAILY_XP,
  AVATAR_LEVEL1_STAGE2_MIN_DAILY_XP,
  AVATAR_LEVEL1_STAGE3_MIN_DAILY_XP,
  getAvatarLevel1Stage2ImagePath,
  getAvatarDisplayTune,
  getAvatarImageMeta,
  getAvatarTierFromLevel,
  type AvatarGender,
  type AvatarHappinessTier,
} from '../lib/avatarLibrary'
import { preloadAvatarAsset } from '../lib/avatarAsset'
import {
  getCachedAvatarDisplaySnapshot,
  saveAvatarDisplayCache,
} from '../lib/avatarDisplayCache'

const TIER_LABELS: Record<AvatarHappinessTier, string> = {
  1: "Start - los geht's!",
  2: 'Wird besser',
  3: 'Gut drauf',
  4: 'Voller Energie',
}

const AVATAR_LEVEL1_START_TEXT_MAX_DAILY_XP = 5

type AvatarCardProps = {
  level: number
  dailyXp: number
  avatarGender?: AvatarGender
  /** Festes Bild (z. B. Onboarding-Slideshow), überschreibt XP/Level-Logik. */
  avatarPreviewSrc?: string
  /** Erzwingt Neuzeichnen bei gleicher `avatarPreviewSrc` (Slideshow). */
  avatarPreviewEpoch?: number
  /** Kurze Feier: 2 s Bild level1_2 + Wackeln nach XP auf einer Unterseite. */
  celebrate?: boolean
  /** Erhöht sich pro Feier — erzwingt Neustart der CSS-Animation in WebKit/Safari. */
  celebrateBurstKey?: number
  /** Max. Kantenlänge des Rahmens (px); Standard = Startseite. */
  frameMaxPx?: number
  /** Erst nach Profil/XP-Sync vom Zielbild wechseln (vermeidet falschen Zwischenstand). */
  profileReady?: boolean
  /** Overlay auf dem Avatar-Rahmen (z. B. Denkblase). */
  frameOverlay?: ReactNode
}

export default function AvatarCard({
  level,
  dailyXp,
  celebrate = false,
  celebrateBurstKey = 0,
  avatarGender = 'male',
  avatarPreviewSrc,
  avatarPreviewEpoch = 0,
  frameMaxPx = AVATAR_FRAME_HOME_MAX_PX,
  profileReady = true,
  frameOverlay,
}: AvatarCardProps) {
  const cachedSnapshot = getCachedAvatarDisplaySnapshot()
  const resolvedGender: AvatarGender = cachedSnapshot.avatarGender ?? avatarGender

  const tier = getAvatarTierFromLevel(level)
  const computedSrc = celebrate
    ? getAvatarLevel1Stage2ImagePath(resolvedGender)
    : getAvatarImageMeta(tier, dailyXp, resolvedGender).src
  const targetSrc = avatarPreviewSrc ?? computedSrc
  const isIntroPreview = Boolean(avatarPreviewSrc)

  const [displaySrc, setDisplaySrc] = useState(() => {
    if (avatarPreviewSrc) return avatarPreviewSrc
    if (cachedSnapshot.src) return cachedSnapshot.src
    return computedSrc
  })
  const displaySrcRef = useRef(displaySrc)
  const imageSrc = avatarPreviewSrc ?? displaySrc
  const displayTune = getAvatarDisplayTune(imageSrc)
  const cropTopPct = displayTune.cropTopPct ?? 0
  const cropBottomPct = displayTune.cropBottomPct ?? 0

  useEffect(() => {
    displaySrcRef.current = displaySrc
  }, [displaySrc])

  useEffect(() => {
    if (isIntroPreview) {
      return
    }

    let cancelled = false

    const persistCache = (src: string) => {
      saveAvatarDisplayCache({
        src,
        avatarGender: resolvedGender,
        dailyXp,
        level,
      })
    }

    const commitSrc = async (src: string) => {
      if (src === displaySrcRef.current) {
        persistCache(src)
        return
      }
      try {
        await preloadAvatarAsset(src)
      } catch {
        /* Bei Ladefehler trotzdem wechseln — Browser zeigt ggf. Platzhalter */
      }
      if (cancelled) return
      displaySrcRef.current = src
      setDisplaySrc(src)
      persistCache(src)
    }

    if (celebrate) {
      const celebrateSrc = getAvatarLevel1Stage2ImagePath(resolvedGender)
      const frameId = requestAnimationFrame(() => {
        void commitSrc(celebrateSrc)
      })
      return () => {
        cancelled = true
        cancelAnimationFrame(frameId)
      }
    }

    if (!profileReady) {
      if (cachedSnapshot.src && displaySrcRef.current !== cachedSnapshot.src) {
        displaySrcRef.current = cachedSnapshot.src
        setDisplaySrc(cachedSnapshot.src)
      }
      return () => {
        cancelled = true
      }
    }

    void commitSrc(targetSrc)

    return () => {
      cancelled = true
    }
  }, [
    targetSrc,
    celebrate,
    resolvedGender,
    celebrateBurstKey,
    isIntroPreview,
    profileReady,
    cachedSnapshot.src,
    dailyXp,
    level,
  ])

  const showLevel1MilestoneAlt = dailyXp >= AVATAR_LEVEL1_MILESTONE_COPY_MIN_DAILY_XP
  const showLevel1DailyGoalCopy = !celebrate && dailyXp >= AVATAR_LEVEL1_STAGE3_MIN_DAILY_XP
  const showLevel1SuccessCopy = !celebrate && dailyXp >= AVATAR_LEVEL1_STAGE2_MIN_DAILY_XP
  const introTogetherAlt = imageSrc.includes('Together') ? 'LifeXP' : null
  const imageAlt =
    introTogetherAlt ??
    (showLevel1MilestoneAlt ? `Avatar Stufe ${tier} (Zwischenstand)` : `Avatar Stufe ${tier}`)

  const moodText = celebrate
    ? 'Gut gemacht - weiter so!'
    : showLevel1DailyGoalCopy
      ? 'Tagesziel erreicht - gut gemacht 😊'
      : showLevel1SuccessCopy
        ? 'Gut gemacht - weiter so!'
        : dailyXp >= AVATAR_LEVEL1_START_TEXT_MAX_DAILY_XP
          ? "Weiter geht's!"
          : TIER_LABELS[1]

  return (
    <section
      className="mb-5 flex w-full flex-col items-center overflow-visible text-center"
      aria-labelledby="avatar-mood"
    >
      <div
        className="relative aspect-square w-full overflow-visible"
        style={{ maxWidth: `min(100%, ${frameMaxPx}px, 50vh)` }}
      >
        <div className="relative w-full overflow-visible rounded-2xl border-2 border-slate-400/90 bg-gradient-to-b from-slate-100 to-slate-200 p-1 shadow-[0_6px_20px_-6px_rgba(15,23,42,0.2)] ring-1 ring-slate-500/15 sm:rounded-3xl sm:p-1.5 dark:border-slate-600 dark:from-slate-900 dark:to-slate-800 dark:ring-slate-700/80">
          <div className="relative mx-auto aspect-square w-full overflow-visible rounded-xl bg-slate-300 sm:rounded-2xl dark:bg-slate-700">
            <div
              key={celebrate ? `celebrate-${celebrateBurstKey}` : 'avatar-image'}
              className={`absolute inset-0 overflow-hidden rounded-xl sm:rounded-2xl ${celebrate ? 'lifexp-avatar-hop-wrap' : ''}`}
            >
              <div
                className="absolute inset-0 origin-center"
                style={
                  {
                    transform: displayTune.scale !== 1 ? `scale(${displayTune.scale})` : undefined,
                    clipPath:
                      cropTopPct || cropBottomPct ? `inset(${cropTopPct}% 0 ${cropBottomPct}% 0)` : undefined,
                  }
                }
              >
                <AvatarPicture
                  src={imageSrc}
                  pictureKey={
                    isIntroPreview ? `${targetSrc}-${avatarPreviewEpoch}` : imageSrc
                  }
                  alt={imageAlt}
                  objectPosition={displayTune.objectPosition}
                  frameMaxPx={frameMaxPx}
                  priority
                />
              </div>
            </div>
            {frameOverlay ? (
              <div className="pointer-events-none absolute inset-0 z-[100] overflow-visible">{frameOverlay}</div>
            ) : null}
          </div>
        </div>
      </div>

      <p
        id="avatar-mood"
        className="mx-auto mt-3 max-w-sm px-1 text-base font-medium leading-snug text-yellow-50/95 dark:text-slate-300"
      >
        {moodText}
      </p>

      {celebrate ? (
        <p className="sr-only" role="status">
          XP gut gemacht — kurze Animation.
        </p>
      ) : null}
    </section>
  )
}
