import type { QuestRecurrence } from './types'

export type SeedQuestInput = {
  title: string
  description?: string
  xp_reward: number
  category: string
  recurrence: QuestRecurrence
  sort_order: number
}

export const DEFAULT_FAMILY_QUESTS: SeedQuestInput[] = [
  {
    title: 'Zimmer aufräumen',
    description: 'Bett machen und Spielzeug wegräumen.',
    xp_reward: 10,
    category: 'haushalt',
    recurrence: 'daily',
    sort_order: 1,
  },
  {
    title: 'Hausaufgaben erledigen',
    description: 'Schulaufgaben für heute fertig machen.',
    xp_reward: 15,
    category: 'lernen',
    recurrence: 'daily',
    sort_order: 2,
  },
  {
    title: '30 Minuten draußen spielen',
    description: 'Bewegung an der frischen Luft.',
    xp_reward: 10,
    category: 'bewegung',
    recurrence: 'daily',
    sort_order: 3,
  },
  {
    title: 'Beim Essen helfen',
    description: 'Tisch decken oder abräumen.',
    xp_reward: 5,
    category: 'haushalt',
    recurrence: 'daily',
    sort_order: 4,
  },
  {
    title: 'Ein Buch lesen',
    description: 'Mindestens 15 Minuten lesen.',
    xp_reward: 8,
    category: 'lernen',
    recurrence: 'daily',
    sort_order: 5,
  },
]
