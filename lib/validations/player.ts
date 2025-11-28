/**
 * Player validation schemas
 * 
 * Zod schemas for validating player-related data
 */

import { z } from 'zod'

// ============================================================================
// Player Schema
// ============================================================================

const playerBaseSchema = z.object({
  first_name: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters'),
  last_name: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters'),
  email: z.string()
    .email('Please enter a valid email address')
    .optional()
    .or(z.literal('')),
  dob: z.string()
    .optional()
    .or(z.literal('')),
})

// ============================================================================
// Create Player Schema
// ============================================================================

export const createPlayerSchema = playerBaseSchema.extend({
  coach_id: z.string().uuid('Invalid coach ID'),
})

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>

// ============================================================================
// Update Player Schema
// ============================================================================

export const updatePlayerSchema = playerBaseSchema.partial()

export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>

// ============================================================================
// Player Form Schema (for client-side forms)
// ============================================================================

export const playerFormSchema = z.object({
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  email: z.string().email().optional().or(z.literal('')),
  dob: z.string().optional(),
})

export type PlayerFormInput = z.infer<typeof playerFormSchema>

// ============================================================================
// Team Assignment Schema
// ============================================================================

export const assignPlayerToTeamsSchema = z.object({
  player_id: z.string().uuid('Invalid player ID'),
  team_ids: z.array(z.string().uuid('Invalid team ID')),
})

export type AssignPlayerToTeamsInput = z.infer<typeof assignPlayerToTeamsSchema>
