export type BeltGroup = 'Beginner' | 'Novice' | 'Advanced I' | 'Advanced II'

export const BELT_GROUPS: Record<BeltGroup, string[]> = {
  Beginner: ['White'],
  Novice: ['Yellow', 'Blue'],
  'Advanced I': ['Red', 'Brown'],
  'Advanced II': ['Black']
}

export const BELT_ORDER = ['White', 'Yellow', 'Blue', 'Red', 'Brown', 'Black'] as const
