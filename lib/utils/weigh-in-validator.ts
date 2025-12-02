/**
 * Weigh-in validation utilities
 * Validates actual weight/height against division limits and suggests alternatives
 */

import { DEFAULT_DIVISIONS, type DivisionConfig, type CategoryConfig } from '@/lib/constants/divisions'

export interface ValidationResult {
  valid: boolean
  outOfRange: 'above' | 'below' | null
  exceededLimit: 'weight' | 'height' | null
  suggestedDivisions: SuggestedDivision[]
}

export interface SuggestedDivision {
  division: DivisionConfig
  category: CategoryConfig
  reason: string
}

/**
 * Validates if actual weight/height falls within the registered category's limits
 */
export function validateWeightHeight(
  actualWeight: number | null,
  actualHeight: number | null,
  registeredCategory: CategoryConfig,
  age: number
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    outOfRange: null,
    exceededLimit: null,
    suggestedDivisions: []
  }

  // Determine if this is height-based (age < 12) or weight-based (age >= 12)
  const isHeightBased = age < 12

  // For height-based categories (Gradeschool - under 12)
  if (isHeightBased && (registeredCategory.minHeight !== undefined || registeredCategory.maxHeight !== undefined)) {
    if (actualHeight === null) {
      result.valid = false
      return result
    }

    const minHeight = registeredCategory.minHeight ?? 0
    const maxHeight = registeredCategory.maxHeight ?? Infinity

    if (actualHeight > maxHeight) {
      result.valid = false
      result.outOfRange = 'above'
      result.exceededLimit = 'height'
    } else if (actualHeight < minHeight) {
      result.valid = false
      result.outOfRange = 'below'
      result.exceededLimit = 'height'
    }
  }

  // For weight-based categories (age >= 12)
  if (!isHeightBased && (registeredCategory.minWeight !== undefined || registeredCategory.maxWeight !== undefined)) {
    if (actualWeight === null) {
      result.valid = false
      return result
    }

    const minWeight = registeredCategory.minWeight ?? 0
    const maxWeight = registeredCategory.maxWeight ?? Infinity

    if (actualWeight > maxWeight) {
      result.valid = false
      result.outOfRange = 'above'
      result.exceededLimit = 'weight'
    } else if (actualWeight < minWeight) {
      result.valid = false
      result.outOfRange = 'below'
      result.exceededLimit = 'weight'
    }
  }

  return result
}

/**
 * Finds alternative divisions that can accommodate the actual measurements
 */
export function findAlternativeDivisions(
  age: number,
  gender: 'male' | 'female',
  actualWeight: number | null,
  actualHeight: number | null,
  outOfRange: 'above' | 'below',
  exceededLimit: 'weight' | 'height'
): SuggestedDivision[] {
  const suggestions: SuggestedDivision[] = []

  // Find the appropriate division for this age
  const division = DEFAULT_DIVISIONS.find(div => {
    const meetsMin = div.minAge === null || age >= div.minAge
    const meetsMax = div.maxAge === null || age <= div.maxAge
    return meetsMin && meetsMax
  })

  if (!division) return suggestions

  // Filter categories by gender and measurement range
  for (const category of division.categories) {
    // Check gender match
    if (category.gender !== 'both' && category.gender !== gender) {
      continue
    }

    let fits = false
    let reason = ''

    // For height-based categories
    if (exceededLimit === 'height' && actualHeight !== null) {
      const minHeight = category.minHeight ?? 0
      const maxHeight = category.maxHeight ?? Infinity

      if (outOfRange === 'above') {
        // Suggest heavier/taller categories
        if (actualHeight >= minHeight && actualHeight <= maxHeight) {
          fits = true
          reason = `Height ${actualHeight}cm fits in ${category.name} (${minHeight}-${maxHeight ?? '∞'}cm)`
        }
      } else {
        // Suggest lighter/shorter categories
        if (actualHeight >= minHeight && actualHeight <= maxHeight) {
          fits = true
          reason = `Height ${actualHeight}cm fits in ${category.name} (${minHeight}-${maxHeight ?? '∞'}cm)`
        }
      }
    }

    // For weight-based categories
    if (exceededLimit === 'weight' && actualWeight !== null) {
      const minWeight = category.minWeight ?? 0
      const maxWeight = category.maxWeight ?? Infinity

      if (outOfRange === 'above') {
        // Suggest heavier categories
        if (actualWeight >= minWeight && actualWeight <= maxWeight) {
          fits = true
          reason = `Weight ${actualWeight}kg fits in ${category.name} (${minWeight}-${maxWeight ?? '∞'}kg)`
        }
      } else {
        // Suggest lighter categories
        if (actualWeight >= minWeight && actualWeight <= maxWeight) {
          fits = true
          reason = `Weight ${actualWeight}kg fits in ${category.name} (${minWeight}-${maxWeight ?? '∞'}kg)`
        }
      }
    }

    if (fits) {
      suggestions.push({
        division,
        category,
        reason
      })
    }
  }

  return suggestions
}

/**
 * Gets the category limits as a human-readable string
 */
export function getCategoryLimits(category: CategoryConfig): string {
  if (category.minHeight !== undefined || category.maxHeight !== undefined) {
    const min = category.minHeight ?? 0
    const max = category.maxHeight ?? '∞'
    return `${min}-${max}cm`
  }

  if (category.minWeight !== undefined || category.maxWeight !== undefined) {
    const min = category.minWeight ?? 0
    const max = category.maxWeight ?? '∞'
    return `${min}-${max}kg`
  }

  return 'No limits'
}
