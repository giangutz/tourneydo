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
    maxAge: 11, // "Age < 11" usually implies 10, but 12 starts Cadet. 11 is the gap. Covering 11 here.
    categories: [
      // Boys & Girls (Mixed or Separate, structure same)
      // Height-based rules [min, max)
      { name: 'Group 0', gender: 'male', maxHeight: 120 },
      { name: 'Group 1', gender: 'male', minHeight: 120, maxHeight: 128 },
      { name: 'Group 2', gender: 'male', minHeight: 128, maxHeight: 136 },
      { name: 'Group 3', gender: 'male', minHeight: 136, maxHeight: 144 },
      { name: 'Group 4', gender: 'male', minHeight: 144, maxHeight: 152 },
      { name: 'Group 5', gender: 'male', minHeight: 152, maxHeight: 160 },
      { name: 'Group 6', gender: 'male', minHeight: 160, maxHeight: 168.01 },

      // Girls
      { name: 'Group 0', gender: 'female', maxHeight: 120 },
      { name: 'Group 1', gender: 'female', minHeight: 120, maxHeight: 128 },
      { name: 'Group 2', gender: 'female', minHeight: 128, maxHeight: 136 },
      { name: 'Group 3', gender: 'female', minHeight: 136, maxHeight: 144 },
      { name: 'Group 4', gender: 'female', minHeight: 144, maxHeight: 152 },
      { name: 'Group 5', gender: 'female', minHeight: 152, maxHeight: 160 },
      { name: 'Group 6', gender: 'female', minHeight: 160, maxHeight: 168.01 },
    ],
  },
  {
    name: 'Cadet',
    minAge: 12,
    maxAge: 14,
    categories: [
      // Men
      { name: 'Fin', gender: 'male', minWeight: null, maxWeight: 33 },
      { name: 'Fly', gender: 'male', minWeight: 33, maxWeight: 37 },
      { name: 'Bantam', gender: 'male', minWeight: 37, maxWeight: 41 },
      { name: 'Feather', gender: 'male', minWeight: 41, maxWeight: 45 },
      { name: 'Light', gender: 'male', minWeight: 45, maxWeight: 49 },
      { name: 'Welter', gender: 'male', minWeight: 49, maxWeight: 53 },
      { name: 'Lt. Middle', gender: 'male', minWeight: 53, maxWeight: 57 },
      { name: 'Middle', gender: 'male', minWeight: 57, maxWeight: 61 },
      { name: 'Lt. Heavy', gender: 'male', minWeight: 61, maxWeight: 65 },
      { name: 'Heavy', gender: 'male', minWeight: 65, maxWeight: null },
      // Women
      { name: 'Fin', gender: 'female', minWeight: null, maxWeight: 29 },
      { name: 'Fly', gender: 'female', minWeight: 29, maxWeight: 33 },
      { name: 'Bantam', gender: 'female', minWeight: 33, maxWeight: 37 },
      { name: 'Feather', gender: 'female', minWeight: 37, maxWeight: 41 },
      { name: 'Light', gender: 'female', minWeight: 41, maxWeight: 44 },
      { name: 'Welter', gender: 'female', minWeight: 44, maxWeight: 47 },
      { name: 'Lt. Middle', gender: 'female', minWeight: 47, maxWeight: 51 },
      { name: 'Middle', gender: 'female', minWeight: 51, maxWeight: 55 },
      { name: 'Lt. Heavy', gender: 'female', minWeight: 55, maxWeight: 59 },
      { name: 'Heavy', gender: 'female', minWeight: 59, maxWeight: null },
    ],
  },
  {
    name: 'Junior',
    minAge: 15,
    maxAge: 17,
    categories: [
      // Men
      { name: 'Fin', gender: 'male', minWeight: null, maxWeight: 45 },
      { name: 'Fly', gender: 'male', minWeight: 45, maxWeight: 48 },
      { name: 'Bantam', gender: 'male', minWeight: 48, maxWeight: 51 },
      { name: 'Feather', gender: 'male', minWeight: 51, maxWeight: 55 },
      { name: 'Light', gender: 'male', minWeight: 55, maxWeight: 59 },
      { name: 'Welter', gender: 'male', minWeight: 59, maxWeight: 63 },
      { name: 'Lt. Middle', gender: 'male', minWeight: 63, maxWeight: 68 },
      { name: 'Middle', gender: 'male', minWeight: 68, maxWeight: 73 },
      { name: 'Lt. Heavy', gender: 'male', minWeight: 73, maxWeight: 78 },
      { name: 'Heavy', gender: 'male', minWeight: 78, maxWeight: null },
      // Women
      { name: 'Fin', gender: 'female', minWeight: null, maxWeight: 42 },
      { name: 'Fly', gender: 'female', minWeight: 42, maxWeight: 44 },
      { name: 'Bantam', gender: 'female', minWeight: 44, maxWeight: 46 },
      { name: 'Feather', gender: 'female', minWeight: 46, maxWeight: 49 },
      { name: 'Light', gender: 'female', minWeight: 49, maxWeight: 52 },
      { name: 'Welter', gender: 'female', minWeight: 52, maxWeight: 55 },
      { name: 'Lt. Middle', gender: 'female', minWeight: 55, maxWeight: 59 },
      { name: 'Middle', gender: 'female', minWeight: 59, maxWeight: 63 },
      { name: 'Lt. Heavy', gender: 'female', minWeight: 63, maxWeight: 68 },
      { name: 'Heavy', gender: 'female', minWeight: 68, maxWeight: null },
    ],
  },
  {
    name: 'Senior',
    minAge: 18,
    maxAge: null,
    categories: [
      // Men
      { name: 'Fin', gender: 'male', minWeight: null, maxWeight: 54 },
      { name: 'Fly', gender: 'male', minWeight: 54, maxWeight: 58 },
      { name: 'Bantam', gender: 'male', minWeight: 58, maxWeight: 63 },
      { name: 'Feather', gender: 'male', minWeight: 63, maxWeight: 68 },
      { name: 'Light', gender: 'male', minWeight: 68, maxWeight: 74 },
      { name: 'Welter', gender: 'male', minWeight: 74, maxWeight: 80 },
      { name: 'Middle', gender: 'male', minWeight: 80, maxWeight: 87 },
      { name: 'Heavy', gender: 'male', minWeight: 87, maxWeight: null },
      // Women
      { name: 'Fin', gender: 'female', minWeight: null, maxWeight: 46 },
      { name: 'Fly', gender: 'female', minWeight: 46, maxWeight: 49 },
      { name: 'Bantam', gender: 'female', minWeight: 49, maxWeight: 53 },
      { name: 'Feather', gender: 'female', minWeight: 53, maxWeight: 57 },
      { name: 'Light', gender: 'female', minWeight: 57, maxWeight: 62 },
      { name: 'Welter', gender: 'female', minWeight: 62, maxWeight: 67 },
      { name: 'Middle', gender: 'female', minWeight: 67, maxWeight: 73 },
      { name: 'Heavy', gender: 'female', minWeight: 73, maxWeight: null },
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
