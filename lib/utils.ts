import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export * from './utils/division-labels'
import type { Player } from "@/types/models"

/**
 * Merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string or Date object to a localized date string
 * 
 * @param date - Date string or Date object
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, locale = 'en-US'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format a date string or Date object to a short date string
 * 
 * @param date - Date string or Date object
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted short date string (e.g., "Jan 1, 2024")
 */
export function formatShortDate(date: string | Date, locale = 'en-US'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Get a player's full name
 * 
 * @param player - Player object
 * @returns Full name (first + last)
 */
export function formatPlayerName(player: Player): string {
  return `${player.first_name} ${player.last_name}`
}

/**
 * Get initials from a name
 * 
 * @param name - Full name
 * @returns Initials (e.g., "John Doe" -> "JD")
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Calculate age from date of birth
 * 
 * @param dob - Date of birth string or Date object
 * @returns Age in years
 */
export function calculateAge(dob: string | Date): number {
  const birthDate = new Date(dob)
  const today = new Date()
  // WT Rules: Age is calculated by year difference only (current year - birth year)
  return today.getFullYear() - birthDate.getFullYear()
}

/**
 * Get Tailwind color class for belt level
 * 
 * @param beltLevel - Belt level
 * @returns Tailwind color class
 */
export function getBeltLevelColor(beltLevel: string | null): string {
  switch (beltLevel) {
    case 'White':
      return 'bg-gray-100 text-gray-800 border-gray-300'
    case 'Yellow':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'Blue':
      return 'bg-blue-100 text-blue-800 border-blue-300'
    case 'Red':
      return 'bg-red-100 text-red-800 border-red-300'
    case 'Brown':
      return 'bg-amber-100 text-amber-800 border-amber-300'
    case 'Black':
      return 'bg-gray-900 text-white border-gray-700'
    default:
      return 'bg-gray-100 text-gray-600 border-gray-300'
  }
}

/**
 * Format a number as currency
 * 
 * @param amount - Amount to format
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = 'PHP'): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
  }).format(amount)
}

// Format Currency without currency symbol
export function formatCurrencyNoSymbol(amount: number, currency = 'PHP'): string {
  return new Intl.NumberFormat('en-PH', {
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Map belt level to skill category for Standard tournaments
 * White -> Beginner
 * Yellow, Blue -> Novice I
 * Red, Brown -> Novice II
 * Black -> Advanced
 */
import { BELT_GROUPS } from '@/lib/constants/belts'

/**
 * Map belt level to skill category using BELT_GROUPS constant
 */
export function getBeltSkillCategory(beltLevel: string | null | undefined): string {
  if (!beltLevel) return 'Unknown' // Default to Unknown if missing

  const belt = beltLevel.toLowerCase()

  // Iterate through defined groups
  for (const [groupName, colors] of Object.entries(BELT_GROUPS)) {
    // Check if the belt matches any color in this group
    if (colors.some(color => belt.includes(color.toLowerCase()))) {
      return groupName
    }
  }

  // Fallback checks if exact match failed (e.g. "Low Yellow")
  if (belt.includes('white')) return 'Beginner'
  if (belt.includes('yellow') || belt.includes('blue')) return 'Novice'
  if (belt.includes('red') || belt.includes('brown')) return 'Advanced I'
  if (belt.includes('black')) return 'Advanced II'

  return 'Unknown'
}
