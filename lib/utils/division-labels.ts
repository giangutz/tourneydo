/**
 * Centralized Division Label Utilities
 * 
 * These functions provide consistent labeling for divisions, categories, and skill levels
 * across the entire application. They work with tournament-configured data rather than
 * hardcoded defaults to support custom tournament settings.
 */

export interface DivisionLike {
  name: string
  minAge?: number | null
  maxAge?: number | null
}

export interface CategoryLike {
  name: string
  gender: 'male' | 'female' | 'both'
  minWeight?: number | null
  maxWeight?: number | null
  minHeight?: number | null
  maxHeight?: number | null
}

/**
 * Get gender label based on division and gender
 * - Youth divisions (Gradeschool, Cadet, Junior): Boys/Girls
 * - Senior division: Men/Women
 * - Both gender: Mixed
 */
export function getGenderLabel(gender: 'male' | 'female' | 'both', divisionName: string): string {
  if (gender === 'both') return 'Mixed'

  const isYouth = divisionName.toLowerCase().includes('cadet') ||
    divisionName.toLowerCase().includes('gradeschool') ||
    divisionName.toLowerCase().includes('junior')

  if (gender === 'male') {
    return isYouth ? 'Boys' : 'Men'
  } else {
    return isYouth ? 'Girls' : 'Women'
  }
}

/**
 * Normalize category name for display
 * Examples: "FEATHER" → "Feather", "Lt. Middle" → "Lt. Middle"
 */
export function getCategoryDisplayName(categoryName: string): string {
  if (!categoryName) return ''

  // Handle special cases with abbreviations (Lt., etc.)
  const words = categoryName.split(' ')
  return words.map(word => {
    // Keep abbreviations like "Lt." as-is
    if (word.includes('.')) return word
    // Capitalize first letter, lowercase rest
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  }).join(' ')
}

/**
 * Get weight or height range label
 * - Gradeschool: Height range (e.g., "120-127.99cm")
 * - Other divisions: Weight range (e.g., "Under 45kg", "45.01-48kg", "Over 78kg")
 */
export function getWeightHeightLabel(category: CategoryLike, divisionName: string): string {
  const isGradeschool = divisionName.toLowerCase().includes('gradeschool')

  if (isGradeschool) {
    // Height-based for Gradeschool
    if (category.minHeight !== undefined && category.minHeight !== null) {
      if (category.maxHeight !== undefined && category.maxHeight !== null) {
        return `${category.minHeight}-${category.maxHeight}cm`
      }
      return `Over ${category.minHeight}cm`
    }
    if (category.maxHeight !== undefined && category.maxHeight !== null) {
      return `Under ${category.maxHeight}cm`
    }
    return ''
  } else {
    // Weight-based for other divisions
    if (category.minWeight !== undefined && category.minWeight !== null) {
      if (category.maxWeight !== undefined && category.maxWeight !== null) {
        return `${category.minWeight}-${category.maxWeight}kg`
      }
      return `Over ${category.minWeight}kg`
    }
    if (category.maxWeight !== undefined && category.maxWeight !== null) {
      return `Under ${category.maxWeight}kg`
    }
    return ''
  }
}

/**
 * Get division + gender label
 * Example: "Gradeschool Boys", "Senior Men"
 */
export function getDivisionLabel(division: DivisionLike | null, category: CategoryLike | null): string {
  if (!division || !category) return 'General'

  const genderLabel = getGenderLabel(category.gender, division.name)
  return `${division.name} ${genderLabel}`.trim()
}

/**
 * Get division + gender + category label
 * Example: "Cadet Boys - Feather", "Junior Girls - Lt. Middle"
 */
export function getDivisionCategoryLabel(division: DivisionLike | null, category: CategoryLike | null): string {
  if (!division || !category) return 'General'

  const genderLabel = getGenderLabel(category.gender, division.name)
  const categoryName = getCategoryDisplayName(category.name)

  return `${division.name} ${genderLabel} - ${categoryName}`.trim()
}

/**
 * Get division + gender + skill level + category label
 * For Standard tournaments: "Cadet Boys Novice I - Feather"
 * For Open tournaments: Same as getDivisionCategoryLabel
 */
export function getDivisionCategorySkillLabel(
  division: DivisionLike | null,
  category: CategoryLike | null,
  skillLevel?: string
): string {
  if (!division || !category) return 'General'

  const genderLabel = getGenderLabel(category.gender, division.name)
  const categoryName = getCategoryDisplayName(category.name)
  const skillLevelLabel = skillLevel ? ` ${skillLevel}` : ''

  return `${division.name} ${genderLabel}${skillLevelLabel} - ${categoryName}`.trim()
}

/**
 * Get complete division label with optional weight/height
 * Standard: "Gradeschool Boys Novice I - Group 1 (120-127.99cm)"
 * Open: "Junior Men - Under 45kg"
 */
export function getFullDivisionLabel(
  division: DivisionLike | null,
  category: CategoryLike | null,
  skillLevel?: string,
  includeWeightHeight: boolean = false
): string {
  if (!division || !category) return 'General'

  const baseLabel = getDivisionCategorySkillLabel(division, category, skillLevel)

  if (includeWeightHeight) {
    const weightHeightLabel = getWeightHeightLabel(category, division.name)
    if (weightHeightLabel) {
      return `${baseLabel} (${weightHeightLabel})`
    }
  }

  return baseLabel
}
