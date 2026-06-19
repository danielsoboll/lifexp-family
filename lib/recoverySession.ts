import { applyAppIcons } from './appIcon'
import { getAvatarImageMeta } from './avatarLibrary'
import { saveAvatarDisplayCache } from './avatarDisplayCache'
import { clearOnboardingDraft } from './onboardingDraft'
import type { ProfileSettings } from './profile'
import { clearPwaInstallLater } from './pwaInstall'
import { savePrimaryGoal, saveSignupDateFromProfileStartDate } from './storage'
import { markSessionEstablished, setStoredUsername } from './user'

/** Profil aus Supabase in Session + localStorage übernehmen (Recovery / Wiederherstellung). */
export function applyProfileToLocalSession(settings: ProfileSettings): void {
  setStoredUsername(settings.username)
  markSessionEstablished()
  saveAvatarDisplayCache({
    src: getAvatarImageMeta(1, 0, settings.avatarGender).src,
    avatarGender: settings.avatarGender,
    level: settings.level,
  })
  applyAppIcons(settings.avatarGender)
  savePrimaryGoal(settings.goalType)
  saveSignupDateFromProfileStartDate(settings.startDate)
  if (settings.appInstalled) {
    clearPwaInstallLater()
  }
  clearOnboardingDraft()
}
