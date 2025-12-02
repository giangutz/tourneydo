import {
  formatDate,
  formatShortDate,
  formatPlayerName,
  getInitials,
  calculateAge,
  getBeltLevelColor,
  formatCurrency,
} from '@/lib/utils'
import { mockPlayer } from '@/__tests__/utils/test-utils'

describe('Utility Functions', () => {
  describe('formatDate', () => {
    it('should format date string correctly', () => {
      const result = formatDate('2024-01-15')
      expect(result).toBe('January 15, 2024')
    })

    it('should format Date object correctly', () => {
      const date = new Date('2024-06-20')
      const result = formatDate(date)
      expect(result).toBe('June 20, 2024')
    })
  })

  describe('formatShortDate', () => {
    it('should format date in short format', () => {
      const result = formatShortDate('2024-01-15')
      expect(result).toBe('Jan 15, 2024')
    })
  })

  describe('formatPlayerName', () => {
    it('should combine first and last name', () => {
      const player = mockPlayer({ first_name: 'John', last_name: 'Doe' })
      const result = formatPlayerName(player)
      expect(result).toBe('John Doe')
    })
  })

  describe('getInitials', () => {
    it('should return initials from full name', () => {
      expect(getInitials('John Doe')).toBe('JD')
    })

    it('should handle single name', () => {
      expect(getInitials('John')).toBe('J')
    })

    it('should handle three names', () => {
      expect(getInitials('John Michael Doe')).toBe('JM')
    })

    it('should return uppercase initials', () => {
      expect(getInitials('john doe')).toBe('JD')
    })
  })

  describe('calculateAge', () => {
    it('should calculate age correctly', () => {
      const dob = '2010-01-15'
      const age = calculateAge(dob)
      // Age will vary based on current date, so we check it's reasonable
      expect(age).toBeGreaterThanOrEqual(14)
      expect(age).toBeLessThan(20)
    })

    it('should handle Date object', () => {
      const dob = new Date('2010-01-15')
      const age = calculateAge(dob)
      expect(age).toBeGreaterThanOrEqual(14)
    })

    it('should account for birthday not yet passed this year', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() - 10)
      futureDate.setMonth(futureDate.getMonth() + 1) // Next month
      const age = calculateAge(futureDate)
      expect(age).toBe(9) // Should be 9, not 10
    })
  })

  describe('getBeltLevelColor', () => {
    it('should return correct color for White belt', () => {
      expect(getBeltLevelColor('White')).toBe('bg-gray-100 text-gray-800 border-gray-300')
    })

    it('should return correct color for Yellow belt', () => {
      expect(getBeltLevelColor('Yellow')).toBe('bg-yellow-100 text-yellow-800 border-yellow-300')
    })

    it('should return correct color for Blue belt', () => {
      expect(getBeltLevelColor('Blue')).toBe('bg-blue-100 text-blue-800 border-blue-300')
    })

    it('should return correct color for Red belt', () => {
      expect(getBeltLevelColor('Red')).toBe('bg-red-100 text-red-800 border-red-300')
    })

    it('should return correct color for Brown belt', () => {
      expect(getBeltLevelColor('Brown')).toBe('bg-amber-100 text-amber-800 border-amber-300')
    })

    it('should return correct color for Black belt', () => {
      expect(getBeltLevelColor('Black')).toBe('bg-gray-900 text-white border-gray-700')
    })

    it('should return default color for null', () => {
      expect(getBeltLevelColor(null)).toBe('bg-gray-100 text-gray-600 border-gray-300')
    })

    it('should return default color for unknown belt', () => {
      expect(getBeltLevelColor('Unknown')).toBe('bg-gray-100 text-gray-600 border-gray-300')
    })
  })

  describe('formatCurrency', () => {
    it('should format currency in PHP', () => {
      const result = formatCurrency(1000)
      expect(result).toContain('1,000')
      expect(result).toContain('₱')
    })

    it('should handle decimal values', () => {
      const result = formatCurrency(1234.56)
      expect(result).toContain('1,234.56')
    })

    it('should handle zero', () => {
      const result = formatCurrency(0)
      expect(result).toContain('0')
    })
  })
})
