const STORAGE_KEY = 'lifexp_family_setup_guide_v1'

export type SetupGuideStep =
  | 'welcome_members'
  | 'first_quest'
  | 'invite_code'
  | 'member_profile'
  | 'complete'

export type SetupGuideTarget = 'admin' | 'new_quest' | 'first_member' | 'own_profile'

export type SetupGuideState = {
  familyId: string
  finished: boolean
  visitedQuestNew: boolean
  visitedAdminAfterQuest: boolean
  visitedMemberProfile: boolean
  dismissedStep: SetupGuideStep | null
}

const EMPTY: SetupGuideState = {
  familyId: '',
  finished: false,
  visitedQuestNew: false,
  visitedAdminAfterQuest: false,
  visitedMemberProfile: false,
  dismissedStep: null,
}

function readAll(): Record<string, SetupGuideState> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, SetupGuideState>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(map: Record<string, SetupGuideState>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function readSetupGuideState(familyId: string): SetupGuideState {
  const map = readAll()
  const stored = map[familyId]
  if (!stored) return { ...EMPTY, familyId }
  return { ...EMPTY, ...stored, familyId }
}

export function writeSetupGuideState(state: SetupGuideState): void {
  const map = readAll()
  map[state.familyId] = state
  writeAll(map)
}

export function totalFamilyMembers(parentCount: number, childCount: number): number {
  return parentCount + childCount
}

export function resolveSetupGuideStep(input: {
  state: SetupGuideState
  parentCount: number
  childCount: number
  canAdmin: boolean
}): SetupGuideStep | null {
  if (!input.canAdmin || input.state.finished) return null

  const members = totalFamilyMembers(input.parentCount, input.childCount)
  if (members < 2) return 'welcome_members'
  if (!input.state.visitedQuestNew) return 'first_quest'
  if (!input.state.visitedAdminAfterQuest) return 'invite_code'
  if (!input.state.visitedMemberProfile) return 'member_profile'
  return 'complete'
}

export function setupGuideCopy(step: SetupGuideStep): { title: string; body: string; target: SetupGuideTarget | null } {
  switch (step) {
    case 'welcome_members':
      return {
        title: 'Willkommen bei LifeXP Family!',
        body: 'Hier dein nächster Schritt: trage deine Familienmitglieder ein.',
        target: 'admin',
      }
    case 'first_quest':
      return {
        title: 'Sehr gut!',
        body: 'Ab jetzt kannst du Aufgaben für andere Familienmitglieder anlegen.',
        target: 'new_quest',
      }
    case 'invite_code':
      return {
        title: 'Weiter geht’s',
        body: 'Deine Familienmitglieder können sich über den Einladungscode mit deiner Familie verbinden.',
        target: 'admin',
      }
    case 'member_profile':
      return {
        title: 'Fast geschafft',
        body: 'Nun kann jedes Familienmitglied Aufgaben einstellen und seine Aufgaben verfolgen.',
        target: 'first_member',
      }
    case 'complete':
      return {
        title: 'Super, du hast LifeXP Family verstanden!',
        body: 'Viel Spaß und Erfolg bei der Benutzung.',
        target: null,
      }
  }
}

export function markSetupGuideQuestVisited(familyId: string): void {
  const state = readSetupGuideState(familyId)
  if (state.visitedQuestNew) return
  writeSetupGuideState({ ...state, familyId, visitedQuestNew: true, dismissedStep: null })
}

export function markSetupGuideAdminVisited(familyId: string): void {
  const state = readSetupGuideState(familyId)
  if (!state.visitedQuestNew || state.visitedAdminAfterQuest) return
  writeSetupGuideState({ ...state, familyId, visitedAdminAfterQuest: true, dismissedStep: null })
}

export function markSetupGuideMemberVisited(familyId: string): void {
  const state = readSetupGuideState(familyId)
  if (state.visitedMemberProfile) return
  writeSetupGuideState({ ...state, familyId, visitedMemberProfile: true, dismissedStep: null })
}

export function dismissSetupGuideStep(familyId: string, step: SetupGuideStep): void {
  const state = readSetupGuideState(familyId)
  if (step === 'complete') {
    writeSetupGuideState({ ...state, familyId, finished: true, dismissedStep: null })
    return
  }
  writeSetupGuideState({ ...state, familyId, dismissedStep: step })
}

export function clearSetupGuideDismiss(familyId: string): void {
  const state = readSetupGuideState(familyId)
  if (!state.dismissedStep) return
  writeSetupGuideState({ ...state, familyId, dismissedStep: null })
}

export function setupGuideTargetAttr(target: SetupGuideTarget): string {
  return `setup-guide-${target}`
}

export function firstOtherMemberHref(input: {
  memberKind: 'parent' | 'child' | null
  memberId: string | null
  parents: { id: string }[]
  children: { id: string }[]
}): string | null {
  if (!input.memberId) return null
  for (const parent of input.parents) {
    if (input.memberKind === 'parent' && parent.id === input.memberId) continue
    return `/parents/${parent.id}`
  }
  for (const child of input.children) {
    if (input.memberKind === 'child' && child.id === input.memberId) continue
    return `/children/${child.id}`
  }
  return null
}

export function isSoloFamily(parentCount: number, childCount: number): boolean {
  return totalFamilyMembers(parentCount, childCount) < 2
}

export function soloQuestBlockedMessage(): { title: string; body: string } {
  return {
    title: 'Erst Familienmitglieder anlegen',
    body: 'Du kannst keine Aufgaben für dich selbst eintragen. Lege zuerst weitere Familienmitglieder unter Admin an.',
  }
}

export function notifySetupGuideChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('lifexp-setup-guide-changed'))
}
