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
      { name: 'Group 1', gender: 'male', minHeight: 144, maxHeight: 152 },
      { name: 'Group 2', gender: 'male', minHeight: 152, maxHeight: 160 },
      { name: 'Group 3', gender: 'male', minHeight: 160, maxHeight: null },
      // Girls
      { name: 'Group 1', gender: 'female', minHeight: 144, maxHeight: 152 },
      { name: 'Group 2', gender: 'female', minHeight: 152, maxHeight: 160 },
      { name: 'Group 3', gender: 'female', minHeight: 160, maxHeight: null },
    ],
  },
  {
    name: 'Cadet',
    minAge: 12,
    maxAge: 14,
    categories: [
      // Men
      { name: 'FIN', gender: 'male', minWeight: null, maxWeight: 33 },
      { name: 'FLY', gender: 'male', minWeight: 33, maxWeight: 37 },
      { name: 'BANTAM', gender: 'male', minWeight: 37, maxWeight: 41 },
      { name: 'FEATHER', gender: 'male', minWeight: 41, maxWeight: 45 },
      { name: 'LIGHT', gender: 'male', minWeight: 45, maxWeight: 49 },
      { name: 'WELTER', gender: 'male', minWeight: 49, maxWeight: 53 },
      { name: 'LT. MIDDLE', gender: 'male', minWeight: 53, maxWeight: 57 },
      { name: 'MIDDLE', gender: 'male', minWeight: 57, maxWeight: 61 },
      { name: 'LT. HEAVY', gender: 'male', minWeight: 61, maxWeight: 65 },
      { name: 'HEAVY', gender: 'male', minWeight: 65, maxWeight: null },
      // Women
      { name: 'FIN', gender: 'female', minWeight: null, maxWeight: 29 },
      { name: 'FLY', gender: 'female', minWeight: 29, maxWeight: 33 },
      { name: 'BANTAM', gender: 'female', minWeight: 33, maxWeight: 37 },
      { name: 'FEATHER', gender: 'female', minWeight: 37, maxWeight: 41 },
      { name: 'LIGHT', gender: 'female', minWeight: 41, maxWeight: 44 },
      { name: 'WELTER', gender: 'female', minWeight: 44, maxWeight: 47 },
      { name: 'LT. MIDDLE', gender: 'female', minWeight: 47, maxWeight: 51 },
      { name: 'MIDDLE', gender: 'female', minWeight: 51, maxWeight: 55 },
      { name: 'LT. HEAVY', gender: 'female', minWeight: 55, maxWeight: 59 },
      { name: 'HEAVY', gender: 'female', minWeight: 59, maxWeight: null },
    ],
  },
  {
    name: 'Junior',
    minAge: 15,
    maxAge: 17,
    categories: [
      // Men
      { name: 'FIN', gender: 'male', minWeight: null, maxWeight: 45 },
      { name: 'FLY', gender: 'male', minWeight: 45, maxWeight: 48 },
      { name: 'BANTAM', gender: 'male', minWeight: 48, maxWeight: 51 },
      { name: 'FEATHER', gender: 'male', minWeight: 51, maxWeight: 55 },
      { name: 'LIGHT', gender: 'male', minWeight: 55, maxWeight: 59 },
      { name: 'WELTER', gender: 'male', minWeight: 59, maxWeight: 63 },
      { name: 'LT. MIDDLE', gender: 'male', minWeight: 63, maxWeight: 68 },
      { name: 'MIDDLE', gender: 'male', minWeight: 68, maxWeight: 73 },
      { name: 'LT. HEAVY', gender: 'male', minWeight: 73, maxWeight: 78 },
      { name: 'HEAVY', gender: 'male', minWeight: 78, maxWeight: null },
      // Women
      { name: 'FIN', gender: 'female', minWeight: null, maxWeight: 42 },
      { name: 'FLY', gender: 'female', minWeight: 42, maxWeight: 44 },
      { name: 'BANTAM', gender: 'female', minWeight: 44, maxWeight: 46 },
      { name: 'FEATHER', gender: 'female', minWeight: 46, maxWeight: 49 },
      { name: 'LIGHT', gender: 'female', minWeight: 49, maxWeight: 52 },
      { name: 'WELTER', gender: 'female', minWeight: 52, maxWeight: 55 },
      { name: 'LT. MIDDLE', gender: 'female', minWeight: 55, maxWeight: 59 },
      { name: 'MIDDLE', gender: 'female', minWeight: 59, maxWeight: 63 },
      { name: 'LT. HEAVY', gender: 'female', minWeight: 63, maxWeight: 68 },
      { name: 'HEAVY', gender: 'female', minWeight: 68, maxWeight: null },
    ],
  },
  {
    name: 'Senior',
    minAge: 18,
    maxAge: null,
    categories: [
      // Men
      { name: 'FINWEIGHT', gender: 'male', minWeight: null, maxWeight: 54 },
      { name: 'FLYWEIGHT', gender: 'male', minWeight: 54, maxWeight: 58 },
      { name: 'BANTAMWEIGHT', gender: 'male', minWeight: 58, maxWeight: 63 },
      { name: 'FEATHERWEIGHT', gender: 'male', minWeight: 63, maxWeight: 68 },
      { name: 'LIGHTWEIGHT', gender: 'male', minWeight: 68, maxWeight: 74 },
      { name: 'WELTERWEIGHT', gender: 'male', minWeight: 74, maxWeight: 80 },
      { name: 'MIDDLEWEIGHT', gender: 'male', minWeight: 80, maxWeight: 87 },
      { name: 'HEAVYWEIGHT', gender: 'male', minWeight: 87, maxWeight: null },
      // Women
      { name: 'FINWEIGHT', gender: 'female', minWeight: null, maxWeight: 46 },
      { name: 'FLYWEIGHT', gender: 'female', minWeight: 46, maxWeight: 49 },
      { name: 'BANTAMWEIGHT', gender: 'female', minWeight: 49, maxWeight: 53 },
      { name: 'FEATHERWEIGHT', gender: 'female', minWeight: 53, maxWeight: 57 },
      { name: 'LIGHTWEIGHT', gender: 'female', minWeight: 57, maxWeight: 62 },
      { name: 'WELTERWEIGHT', gender: 'female', minWeight: 62, maxWeight: 67 },
      { name: 'MIDDLEWEIGHT', gender: 'female', minWeight: 67, maxWeight: 73 },
      { name: 'HEAVYWEIGHT', gender: 'female', minWeight: 73, maxWeight: null },
    ],
  },
]

/**
 * Calculate age from date of birth
 */
export function calculateAge(dob: string | Date): number {
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
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
      const meetsMinHeight = cat.minHeight === undefined || cat.minHeight === null || height > cat.minHeight
      const meetsMaxHeight = cat.maxHeight === undefined || cat.maxHeight === null || height <= cat.maxHeight
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
