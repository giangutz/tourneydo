import {
  createActionSuccess,
  createActionError,
  handleSupabaseError,
  safeAction,
} from '@/lib/utils/errors'

describe('Error Handling Utilities', () => {
  describe('createActionSuccess', () => {
    it('should create success result with data', () => {
      const data = { id: '1', name: 'Test' }
      const result = createActionSuccess(data)

      expect(result).toEqual({
        success: true,
        data,
      })
    })

    it('should handle null data', () => {
      const result = createActionSuccess(null)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })
  })

  describe('createActionError', () => {
    it('should create error result with message', () => {
      const message = 'Something went wrong'
      const result = createActionError(message)

      expect(result).toEqual({
        success: false,
        error: message,
      })
    })
  })

  describe('handleSupabaseError', () => {
    it('should handle duplicate key error (23505)', () => {
      const error = { code: '23505', message: 'duplicate key value' }
      const result = handleSupabaseError(error as any)
      expect(result).toBe('This record already exists')
    })

    it('should handle foreign key violation (23503)', () => {
      const error = { code: '23503', message: 'foreign key violation' }
      const result = handleSupabaseError(error as any)
      expect(result).toBe('Cannot delete this record because it is referenced by other records')
    })

    it('should handle not null violation (23502)', () => {
      const error = { code: '23502', message: 'not null violation' }
      const result = handleSupabaseError(error as any)
      expect(result).toBe('Required field is missing')
    })

    it('should handle not found error (PGRST116)', () => {
      const error = { code: 'PGRST116', message: 'not found' }
      const result = handleSupabaseError(error as any)
      expect(result).toBe('Record not found')
    })

    it('should handle permission denied (42501)', () => {
      const error = { code: '42501', message: 'permission denied' }
      const result = handleSupabaseError(error as any)
      expect(result).toBe('You do not have permission to perform this action')
    })

    it('should return original message for unknown error codes', () => {
      const error = { code: 'UNKNOWN', message: 'Custom error message' }
      const result = handleSupabaseError(error as any)
      expect(result).toBe('Custom error message')
    })

    it('should return default message if no message provided', () => {
      const error = { code: 'UNKNOWN', message: '' }
      const result = handleSupabaseError(error as any)
      expect(result).toBe('An unexpected error occurred')
    })
  })

  describe('safeAction', () => {
    it('should return success result for successful async function', async () => {
      const fn = async () => ({ id: '1', name: 'Test' })
      const result = await safeAction(fn)

      expect(result).toEqual({
        success: true,
        data: { id: '1', name: 'Test' },
      })
    })

    it('should return error result for failed async function', async () => {
      const fn = async () => {
        throw new Error('Operation failed')
      }
      const result = await safeAction(fn)

      expect(result).toEqual({
        success: false,
        error: 'Operation failed',
      })
    })

    it('should handle non-Error throws', async () => {
      const fn = async () => {
        throw 'String error'
      }
      const result = await safeAction(fn)

      expect(result).toEqual({
        success: false,
        error: 'An unexpected error occurred',
      })
    })

    it('should handle async function returning void', async () => {
      const fn = async () => {
        // Do nothing
      }
      const result = await safeAction(fn)

      expect(result.success).toBe(true)
    })
  })
})
