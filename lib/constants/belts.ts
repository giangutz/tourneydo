export type BeltGroup = 'Beginner' | 'Novice I' | 'Novice II' | 'Advanced'

export const BELT_GROUPS: Record<BeltGroup, string[]> = {
  Beginner: ['White'],
  'Novice I': ['Yellow', 'Blue'],
  'Novice II': ['Red', 'Brown'],
  Advanced: ['Black']
}

export const ALL_BELT_GROUPS: BeltGroup[] = ['Beginner', 'Novice I', 'Novice II', 'Advanced']

export const BELT_ORDER = ['White', 'Yellow', 'Blue', 'Red', 'Brown', 'Black'] as const
