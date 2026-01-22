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
  weigh_in_start: z.string()
    .optional()
    .or(z.literal('')),
  weigh_in_end: z.string()
    .optional()
    .or(z.literal('')),
  tournament_type: z.enum(['standard', 'open-belt']).default('standard'),
  description: z.string().optional().or(z.literal('')),
  entry_fee: z.coerce.number().min(0).optional().nullable(),
  venue: z.string().optional().or(z.literal('')),
  max_players: z.coerce.number().min(1).optional().nullable(),
  registration_deadline: z.string().optional().or(z.literal('')),
  courts: z.coerce.number().min(1).optional().nullable(),
  status: z.enum(['upcoming', 'ongoing', 'completed', 'cancelled']).default('upcoming'),
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

export const createTournamentSchema = tournamentBaseSchema.safeExtend({
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
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal('')),
  weigh_in_start: z.string().optional().or(z.literal('')),
  weigh_in_end: z.string().optional().or(z.literal('')),
  tournament_type: z.enum(['standard', 'open-belt']),
  description: z.string().optional(),
  entry_fee: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : Number(val)),
    z.number().min(0, "Entry fee cannot be negative").nullable()
  ),
  venue: z.string().min(1, "Venue is required"),
  max_players: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : Number(val)),
    z.number().int().min(1, "Must have at least 1 participant").nullable()
  ),
  registration_deadline: z.string().refine((val) => val !== '', { message: "Registration deadline is required" }),
  courts: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : Number(val)),
    z.number().int().min(1, "Must have at least 1 court") // Made required as per feedback
  ),
  status: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? 'upcoming' : val),
    z.enum(['upcoming', 'ongoing', 'completed', 'cancelled'])
  ),
  divisions: z.string().optional(), // JSON string of selected divisions
  gender_preference: z.enum(['mixed', 'male', 'female']).default('mixed'),
  allowed_belt_groups: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val)
        } catch {
          return val
        }
      }
      return val
    },
    z.array(z.string()).optional()
  ),
  division_move_policy: z.enum(['allow_move', 'disqualify_only']).default('allow_move'),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) >= new Date(data.start_date)
  }
  return true
}, {
  message: 'End date must be on or after start date',
  path: ['end_date'],
}).refine((data) => {
  if (data.registration_deadline && data.start_date) {
    // Registration deadline usually before start date
    return new Date(data.registration_deadline) <= new Date(data.start_date)
  }
  return true
}, {
  message: 'Registration deadline must be on or before start date',
  path: ['registration_deadline'],
}).refine((data) => {
  if (data.weigh_in_start && data.weigh_in_end) {
    return new Date(data.weigh_in_end) >= new Date(data.weigh_in_start)
  }
  return true
}, {
  message: 'Weigh-in end date must be on or after start date',
  path: ['weigh_in_end'],
})

export type TournamentFormInput = z.infer<typeof tournamentFormSchema>
