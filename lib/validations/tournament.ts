/**
 * Tournament validation schemas
 * 
 * Zod schemas for validating tournament-related data
 */

import { z } from 'zod'

// ============================================================================
// Tournament Schema
// ============================================================================

const tournamentBaseSchema = z.object({
  name: z.string()
    .min(3, 'Tournament name must be at least 3 characters')
    .max(200, 'Tournament name must be less than 200 characters')
    .trim(),
  start_date: z.string()
    .optional()
    .or(z.literal('')),
  end_date: z.string()
    .optional()
    .or(z.literal('')),
}).refine((data) => {
  // If both dates are provided, end date must be after start date
  if (data.start_date && data.end_date && data.start_date !== '' && data.end_date !== '') {
    return new Date(data.end_date) >= new Date(data.start_date)
  }
  return true
}, {
  message: 'End date must be on or after start date',
  path: ['end_date'],
})

// ============================================================================
// Create Tournament Schema
// ============================================================================

export const createTournamentSchema = tournamentBaseSchema.extend({
  organizer_id: z.string().uuid('Invalid organizer ID'),
})

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>

// ============================================================================
// Update Tournament Schema
// ============================================================================

export const updateTournamentSchema = tournamentBaseSchema.partial()

export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>

// ============================================================================
// Tournament Form Schema (for client-side forms)
// ============================================================================

export const tournamentFormSchema = z.object({
  name: z.string().min(3, 'Tournament name is required'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) >= new Date(data.start_date)
  }
  return true
}, {
  message: 'End date must be on or after start date',
  path: ['end_date'],
})

export type TournamentFormInput = z.infer<typeof tournamentFormSchema>
