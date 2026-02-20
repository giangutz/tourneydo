/**
 * Participant validation schemas
 * 
 * Zod schemas for adding and updating tournament participants
 * Ensures all input data is properly validated before processing
 */

import { z } from 'zod'

/**
 * Valid belt levels (must match BeltLevel type from types/models.ts)
 */
const BELT_LEVELS = ['White', 'Yellow', 'Blue', 'Red', 'Brown', 'Black'] as const

/**
 * Schema for adding a new participant to a tournament
 * Supports both creating new players and registering existing players
 */
export const addParticipantSchema = z
  .object({
    tournamentId: z.string().uuid('Invalid tournament ID'),
    teamId: z.string().uuid('Invalid team ID'),
    
    // Existing player (alternative path)
    playerId: z.string().uuid('Invalid player ID').optional(),
    
    // New player fields (required if playerId not provided)
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(100, 'First name must be less than 100 characters')
      .optional(),
    
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(100, 'Last name must be less than 100 characters')
      .optional(),
    
    email: z
      .string()
      .email('Invalid email format')
      .optional(),
    
    dob: z
      .union([z.coerce.date(), z.string().datetime()])
      .optional(),
    
    gender: z
      .enum(['male', 'female'])
      .optional(),
    
    beltLevel: z
      .enum(BELT_LEVELS)
      .optional(),
    
    weight: z
      .number()
      .positive('Weight must be a positive number')
      .max(300, 'Weight must be less than 300 kg')
      .optional(),
    
    height: z
      .number()
      .positive('Height must be a positive number')
      .max(250, 'Height must be less than 250 cm')
      .optional(),
  })
  .refine(
    (data) => {
      // Either playerId OR (firstName AND lastName AND beltLevel) must be provided
      if (data.playerId) {
        return true
      }
      return data.firstName && data.lastName && data.beltLevel
    },
    {
      message: 'Either provide playerId or firstName, lastName, and beltLevel',
      path: ['playerId'],
    }
  )

export type AddParticipantInput = z.infer<typeof addParticipantSchema>

/**
 * Schema for updating a participant in a tournament
 */
export const updateParticipantSchema = z.object({
  registrationId: z.string().uuid('Invalid registration ID'),
  
  status: z
    .enum(['pending', 'verified', 'checked_in', 'completed', 'eliminated'])
    .optional(),
  
  actualWeight: z
    .number()
    .positive('Actual weight must be a positive number')
    .max(300, 'Weight must be less than 300 kg')
    .optional(),
  
  actualHeight: z
    .number()
    .positive('Actual height must be a positive number')
    .max(250, 'Height must be less than 250 cm')
    .optional(),
  
  beltLevel: z
    .enum(BELT_LEVELS)
    .optional(),
})

export type UpdateParticipantInput = z.infer<typeof updateParticipantSchema>
