/**
 * Error handling utilities
 * 
 * Helper functions for consistent error handling across the application
 */

import type { ActionResult } from '@/types/api'
import { PostgrestError } from '@supabase/supabase-js'

/**
 * Create a successful action result
 * 
 * @param data - Data to return
 * @returns ActionResult with success: true
 */
export function createActionSuccess<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

/**
 * Create an error action result
 * 
 * @param message - Error message
 * @returns ActionResult with success: false
 */
export function createActionError(message: string): ActionResult<never> {
  return { success: false, error: message }
}

/**
 * Convert Supabase/Postgrest error to user-friendly message
 * 
 * @param error - Postgrest error object
 * @returns User-friendly error message
 */
export function handleSupabaseError(error: PostgrestError): string {
  // Handle common error codes
  switch (error.code) {
    case '23505':
      return 'This record already exists'
    case '23503':
      return 'Cannot delete this record because it is referenced by other records'
    case '23502':
      return 'Required field is missing'
    case 'PGRST116':
      return 'Record not found'
    case '42501':
      return 'You do not have permission to perform this action'
    default:
      // Return the error message for other cases
      return error.message || 'An unexpected error occurred'
  }
}

/**
 * Safely handle async operations and convert errors to ActionResult
 * 
 * @param fn - Async function to execute
 * @returns ActionResult with either success or error
 */
export async function safeAction<T>(
  fn: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const data = await fn()
    return createActionSuccess(data)
  } catch (error) {
    if (error instanceof Error) {
      return createActionError(error.message)
    }
    return createActionError('An unexpected error occurred')
  }
}
