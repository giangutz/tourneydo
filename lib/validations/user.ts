/**
 * User validation schemas
 * 
 * Zod schemas for validating user-related data
 */

import { z } from 'zod'

// ============================================================================
// User Role Schema
// ============================================================================

export const userRoleSchema = z.enum(['tournament-organizer', 'coach'], {
  message: 'Please select a valid role'
})


// ============================================================================
// Onboarding Schema
// ============================================================================

export const onboardingSchema = z.object({
  role: userRoleSchema,
  clubName: z.string().optional(),
}).refine((data) => {
  // Club name is required for coaches
  if (data.role === 'coach') {
    return !!data.clubName && data.clubName.trim().length > 0
  }
  return true
}, {
  message: 'Club/Gym/School Name is required for Coaches',
  path: ['clubName'],
})

export type OnboardingInput = z.infer<typeof onboardingSchema>

// ============================================================================
// User Update Schema
// ============================================================================

export const userUpdateSchema = z.object({
  email: z.string().email('Please enter a valid email address').optional(),
  role: userRoleSchema.optional(),
})

export type UserUpdateInput = z.infer<typeof userUpdateSchema>
