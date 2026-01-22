/**
 * Default Taekwondo Division and Category Definitions
 */

export interface DivisionConfig {
  name: string
  minAge: number | null
  maxAge: number | null
  categories: CategoryConfig[]
}

export interface CategoryConfig {
  name: string
  gender: 'male' | 'female' | 'both'
  minWeight?: number | null // kg
  maxWeight?: number | null // kg
  minHeight?: number | null // cm
  maxHeight?: number | null // cm
}

export const DEFAULT_DIVISIONS: DivisionConfig[] = [
  {
    name: 'Gradeschool',
    minAge: null,
    maxAge: 11,
    categories: [
      // Boys
      { name: 'Group 0', gender: 'male', minHeight: 112.00,   maxHeight: 119.99 },
      { name: 'Group 1', gender: 'male', minHeight: 120.00, maxHeight: 127.99 },
      { name: 'Group 2', gender: 'male', minHeight: 128.00, maxHeight: 135.99 },
      { name: 'Group 3', gender: 'male', minHeight: 136.00, maxHeight: 143.99 },
      { name: 'Group 4', gender: 'male', minHeight: 144.00, maxHeight: 151.99 },
      { name: 'Group 5', gender: 'male', minHeight: 152.00, maxHeight: 159.99 },
      { name: 'Group 6', gender: 'male', minHeight: 160.00, maxHeight: 168.00 },

      // Girls
      { name: 'Group 0', gender: 'female', minHeight: 112.00,   maxHeight: 119.99 },
      { name: 'Group 1', gender: 'female', minHeight: 120.00, maxHeight: 127.99 },
      { name: 'Group 2', gender: 'female', minHeight: 128.00, maxHeight: 135.99 },
      { name: 'Group 3', gender: 'female', minHeight: 136.00, maxHeight: 143.99 },
      { name: 'Group 4', gender: 'female', minHeight: 144.00, maxHeight: 151.99 },
      { name: 'Group 5', gender: 'female', minHeight: 152.00, maxHeight: 159.99 },
      { name: 'Group 6', gender: 'female', minHeight: 160.00, maxHeight: 168.00 },
    ],
  },

  {
    name: 'Cadet',
    minAge: 12,
    maxAge: 14,
    categories: [
      // Boys
      { name: 'Fin',        gender: 'male', minWeight: null,   maxWeight: 33.00 },
      { name: 'Fly',        gender: 'male', minWeight: 33.01,  maxWeight: 37.00 },
      { name: 'Bantam',     gender: 'male', minWeight: 37.01,  maxWeight: 41.00 },
      { name: 'Feather',    gender: 'male', minWeight: 41.01,  maxWeight: 45.00 },
      { name: 'Light',      gender: 'male', minWeight: 45.01,  maxWeight: 49.00 },
      { name: 'Welter',     gender: 'male', minWeight: 49.01,  maxWeight: 53.00 },
      { name: 'Lt. Middle', gender: 'male', minWeight: 53.01,  maxWeight: 57.00 },
      { name: 'Middle',     gender: 'male', minWeight: 57.01,  maxWeight: 61.00 },
      { name: 'Lt. Heavy',  gender: 'male', minWeight: 61.01,  maxWeight: 65.00 },
      { name: 'Heavy',      gender: 'male', minWeight: 65.01,  maxWeight: null },

      // Girls
      { name: 'Fin',        gender: 'female', minWeight: null,   maxWeight: 29.00 },
      { name: 'Fly',        gender: 'female', minWeight: 29.01,  maxWeight: 33.00 },
      { name: 'Bantam',     gender: 'female', minWeight: 33.01,  maxWeight: 37.00 },
      { name: 'Feather',    gender: 'female', minWeight: 37.01,  maxWeight: 41.00 },
      { name: 'Light',      gender: 'female', minWeight: 41.01,  maxWeight: 44.00 },
      { name: 'Welter',     gender: 'female', minWeight: 44.01,  maxWeight: 47.00 },
      { name: 'Lt. Middle', gender: 'female', minWeight: 47.01,  maxWeight: 51.00 },
      { name: 'Middle',     gender: 'female', minWeight: 51.01,  maxWeight: 55.00 },
      { name: 'Lt. Heavy',  gender: 'female', minWeight: 55.01,  maxWeight: 59.00 },
      { name: 'Heavy',      gender: 'female', minWeight: 59.01,  maxWeight: null },
    ],
  },

  {
    name: 'Junior',
    minAge: 15,
    maxAge: 17,
    categories: [
      // Boys
      { name: 'Fin',        gender: 'male', minWeight: null,   maxWeight: 45.00 },
      { name: 'Fly',        gender: 'male', minWeight: 45.01,  maxWeight: 48.00 },
      { name: 'Bantam',     gender: 'male', minWeight: 48.01,  maxWeight: 51.00 },
      { name: 'Feather',    gender: 'male', minWeight: 51.01,  maxWeight: 55.00 },
      { name: 'Light',      gender: 'male', minWeight: 55.01,  maxWeight: 59.00 },
      { name: 'Welter',     gender: 'male', minWeight: 59.01,  maxWeight: 63.00 },
      { name: 'Lt. Middle', gender: 'male', minWeight: 63.01,  maxWeight: 68.00 },
      { name: 'Middle',     gender: 'male', minWeight: 68.01,  maxWeight: 73.00 },
      { name: 'Lt. Heavy',  gender: 'male', minWeight: 73.01,  maxWeight: 78.00 },
      { name: 'Heavy',      gender: 'male', minWeight: 78.01,  maxWeight: null },

      // Girls
      { name: 'Fin',        gender: 'female', minWeight: null,   maxWeight: 42.00 },
      { name: 'Fly',        gender: 'female', minWeight: 42.01,  maxWeight: 44.00 },
      { name: 'Bantam',     gender: 'female', minWeight: 44.01,  maxWeight: 46.00 },
      { name: 'Feather',    gender: 'female', minWeight: 46.01,  maxWeight: 49.00 },
      { name: 'Light',      gender: 'female', minWeight: 49.01,  maxWeight: 52.00 },
      { name: 'Welter',     gender: 'female', minWeight: 52.01,  maxWeight: 55.00 },
      { name: 'Lt. Middle', gender: 'female', minWeight: 55.01,  maxWeight: 59.00 },
      { name: 'Middle',     gender: 'female', minWeight: 59.01,  maxWeight: 63.00 },
      { name: 'Lt. Heavy',  gender: 'female', minWeight: 63.01,  maxWeight: 68.00 },
      { name: 'Heavy',      gender: 'female', minWeight: 68.01,  maxWeight: null },
    ],
  },

  {
    name: 'Senior',
    minAge: 18,
    maxAge: null,
    categories: [
      // Men
      { name: 'Fin',     gender: 'male', minWeight: null,   maxWeight: 54.00 },
      { name: 'Fly',     gender: 'male', minWeight: 54.01,  maxWeight: 58.00 },
      { name: 'Bantam',  gender: 'male', minWeight: 58.01,  maxWeight: 63.00 },
      { name: 'Feather', gender: 'male', minWeight: 63.01,  maxWeight: 68.00 },
      { name: 'Light',   gender: 'male', minWeight: 68.01,  maxWeight: 74.00 },
      { name: 'Welter',  gender: 'male', minWeight: 74.01,  maxWeight: 80.00 },
      { name: 'Middle',  gender: 'male', minWeight: 80.01,  maxWeight: 87.00 },
      { name: 'Heavy',   gender: 'male', minWeight: 87.01,  maxWeight: null },

      // Women
      { name: 'Fin',     gender: 'female', minWeight: null,   maxWeight: 46.00 },
      { name: 'Fly',     gender: 'female', minWeight: 46.01,  maxWeight: 49.00 },
      { name: 'Bantam',  gender: 'female', minWeight: 49.01,  maxWeight: 53.00 },
      { name: 'Feather', gender: 'female', minWeight: 53.01,  maxWeight: 57.00 },
      { name: 'Light',   gender: 'female', minWeight: 57.01,  maxWeight: 62.00 },
      { name: 'Welter',  gender: 'female', minWeight: 62.01,  maxWeight: 67.00 },
      { name: 'Middle',  gender: 'female', minWeight: 67.01,  maxWeight: 73.00 },
      { name: 'Heavy',   gender: 'female', minWeight: 73.01,  maxWeight: null },
    ],
  },
]

/**
 * Calculate age based on World Taekwondo rules (Year - Year)
 * Uses current year by default, or specific reference date if provided
 */
export function calculateAge(dob: string | Date, referenceDate: Date = new Date()): number {
  const birthDate = new Date(dob)
  const currentYear = referenceDate.getFullYear()
  const birthYear = birthDate.getFullYear()

  return currentYear - birthYear
}

/**
 * Find appropriate division based on age
 */
export function findDivisionByAge(age: number, divisions: DivisionConfig[]): DivisionConfig | null {
  return divisions.find(div => {
    const meetsMin = div.minAge === null || age >= div.minAge
    const meetsMax = div.maxAge === null || age <= div.maxAge
    return meetsMin && meetsMax
  }) || null
}

/**
 * Find appropriate category based on gender and physical attributes
 */
export function findCategory(
  gender: 'male' | 'female',
  weight: number | null,
  height: number | null,
  categories: CategoryConfig[]
): CategoryConfig | null {
  return categories.find(cat => {
    // Check gender match
    if (cat.gender !== 'both' && cat.gender !== gender) {
      return false
    }

    // For height-based categories (Gradeschool)
    if (cat.minHeight !== undefined || cat.maxHeight !== undefined) {
      if (height === null) return false
      // User request: Group 1 >= 144cm < 152cm
      // Group 6 >= 160cm <= 168cm (inclusive max)
      const meetsMinHeight = cat.minHeight === undefined || cat.minHeight === null || height >= cat.minHeight

      let meetsMaxHeight = false
      if (cat.maxHeight === undefined || cat.maxHeight === null) {
        meetsMaxHeight = true
      } else {
        meetsMaxHeight = height < cat.maxHeight
      }

      return meetsMinHeight && meetsMaxHeight
    }

    // For weight-based categories
    if (cat.minWeight !== undefined || cat.maxWeight !== undefined) {
      if (weight === null) return false
      const meetsMinWeight = cat.minWeight === undefined || cat.minWeight === null || weight > cat.minWeight
      const meetsMaxWeight = cat.maxWeight === undefined || cat.maxWeight === null || weight <= cat.maxWeight
      return meetsMinWeight && meetsMaxWeight
    }

    return false
  }) || null
}
