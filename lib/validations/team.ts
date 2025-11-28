/**
 * Team validation schemas
 * 
 * Zod schemas for validating team-related data
 */

import { z } from 'zod'

// ============================================================================
// Team Schema
// ============================================================================

const teamBaseSchema = z.object({
  name: z.string()
    .min(2, 'Team name must be at least 2 characters')
    .max(100, 'Team name must be less than 100 characters')
    .trim(),
})

// ============================================================================
// Create Team Schema
// ============================================================================

export const createTeamSchema = teamBaseSchema.extend({
  user_id: z.string().uuid('Invalid user ID'),
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>

// ============================================================================
// Update Team Schema
// ============================================================================

export const updateTeamSchema = teamBaseSchema.partial()

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>

// ============================================================================
// Team Form Schema (for client-side forms)
// ============================================================================

export const teamFormSchema = z.object({
  name: z.string().min(2, 'Team name is required'),
})

export type TeamFormInput = z.infer<typeof teamFormSchema>
