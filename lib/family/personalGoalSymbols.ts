export type PersonalGoalSymbolId =
  | 'park'
  | 'playground'
  | 'hammock'
  | 'ice_cream'
  | 'beach'
  | 'cinema'
  | 'pizza'
  | 'book'
  | 'bike'
  | 'camping'
  | 'zoo'
  | 'pool'
  | 'roller_coaster'
  | 'gift'
  | 'star'
  | 'teddy'
  | 'game'
  | 'music'
  | 'art'
  | 'friends'

export type PersonalGoalSymbol = {
  id: PersonalGoalSymbolId
  emoji: string
  label: string
}

export const PERSONAL_GOAL_SYMBOLS: readonly PersonalGoalSymbol[] = [
  { id: 'park', emoji: '🌳', label: 'Park' },
  { id: 'playground', emoji: '🛝', label: 'Spielplatz' },
  { id: 'hammock', emoji: '🛏️', label: 'Hängematte' },
  { id: 'ice_cream', emoji: '🍦', label: 'Eis essen' },
  { id: 'beach', emoji: '🏖️', label: 'Strand' },
  { id: 'cinema', emoji: '🎬', label: 'Kino' },
  { id: 'pizza', emoji: '🍕', label: 'Pizza' },
  { id: 'book', emoji: '📚', label: 'Buch' },
  { id: 'bike', emoji: '🚲', label: 'Fahrrad' },
  { id: 'camping', emoji: '⛺', label: 'Camping' },
  { id: 'zoo', emoji: '🦁', label: 'Zoo' },
  { id: 'pool', emoji: '🏊', label: 'Schwimmbad' },
  { id: 'roller_coaster', emoji: '🎢', label: 'Achterbahn' },
  { id: 'gift', emoji: '🎁', label: 'Geschenk' },
  { id: 'star', emoji: '⭐', label: 'Stern' },
  { id: 'teddy', emoji: '🧸', label: 'Kuscheltier' },
  { id: 'game', emoji: '🎮', label: 'Spielen' },
  { id: 'music', emoji: '🎵', label: 'Musik' },
  { id: 'art', emoji: '🎨', label: 'Malen' },
  { id: 'friends', emoji: '👫', label: 'Freunde' },
] as const

const SYMBOL_BY_ID = new Map(PERSONAL_GOAL_SYMBOLS.map((symbol) => [symbol.id, symbol]))

export function personalGoalSymbolEmoji(symbolId: string): string {
  return SYMBOL_BY_ID.get(symbolId as PersonalGoalSymbolId)?.emoji ?? '🎯'
}

export function personalGoalSymbolLabel(symbolId: string): string {
  return SYMBOL_BY_ID.get(symbolId as PersonalGoalSymbolId)?.label ?? 'Ziel'
}

export function isPersonalGoalSymbolId(value: string): value is PersonalGoalSymbolId {
  return SYMBOL_BY_ID.has(value as PersonalGoalSymbolId)
}
