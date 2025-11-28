/**
 * API and Server Action type definitions
 * 
 * This file contains types for API responses, server actions,
 * and other data transfer objects.
 */

// ============================================================================
// Server Action Result Types
// ============================================================================

/**
 * Standard result type for server actions
 * Provides consistent error handling across all actions
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Helper type for actions that return data on success
 */
export type ActionSuccess<T> = Extract<ActionResult<T>, { success: true }>

/**
 * Helper type for action errors
 */
export type ActionError = Extract<ActionResult<never>, { success: false }>

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
}

// ============================================================================
// Form Data Types
// ============================================================================

/**
 * Helper type for extracting form data values
 */
export type FormDataValue = string | File | null

/**
 * Helper to convert FormData to typed object
 */
export type FormDataToObject<T> = {
  [K in keyof T]: FormDataValue
}

// ============================================================================
// Error Types
// ============================================================================

export interface ValidationError {
  field: string
  message: string
}

export interface ApiError {
  message: string
  code?: string
  validationErrors?: ValidationError[]
}
