/**
 * API Response Handler Utilities
 * 
 * Standardized response formatting for all API routes
 * Ensures consistent error and success responses across the application
 * 
 * Usage:
 * - Success: return successResponse({ data }, 200)
 * - Error: return errorResponse('ERROR_CODE', 'Message', 400)
 */

import { NextResponse } from 'next/server'

/**
 * Structured error response for API routes
 */
export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, string>
  }
}

/**
 * Structured success response for API routes
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
}

/**
 * Return a standardized success response
 * 
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with success structure
 * 
 * @example
 * return successResponse({ id: '123', name: 'Test' }, 201)
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  )
}

/**
 * Return a standardized error response
 * 
 * @param code - Machine-readable error code (e.g., 'UNAUTHORIZED', 'NOT_FOUND')
 * @param message - User-friendly error message
 * @param status - HTTP status code (default: 400)
 * @param details - Optional field-level error details
 * @returns NextResponse with error structure
 * 
 * @example
 * return errorResponse('VALIDATION_ERROR', 'Email is required', 400, { email: 'Required' })
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: Record<string, string>
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status }
  )
}

/**
 * HTTP status code mapping for common errors
 */
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  
  // Client errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server errors
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

/**
 * Standard error codes
 */
export const ERROR_CODE = {
  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Rate limiting
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
} as const
