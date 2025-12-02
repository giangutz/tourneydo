import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '@/components/theme-provider'
import type { Player, Team, Tournament, Match, TournamentRegistration } from '@/types/models'

/**
 * Custom render function that wraps components with necessary providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <ThemeProvider>{children}</ThemeProvider>
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

/**
 * Mock data factories for creating test fixtures
 */

export const mockPlayer = (overrides?: Partial<Player>): Player => ({
  id: 'player-1',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  dob: '2010-01-15',
  weight: 50,
  height: 150,
  belt_level: 'Blue',
  gender: 'male',
  coach_id: 'coach-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

export const mockTeam = (overrides?: Partial<Team>): Team => ({
  id: 'team-1',
  name: 'Test Team',
  user_id: 'coach-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

export const mockTournament = (overrides?: Partial<Tournament>): Tournament => ({
  id: 'tournament-1',
  name: 'Summer Championship 2025',
  organizer_id: 'organizer-1',
  start_date: '2025-06-01',
  end_date: '2025-06-03',
  description: 'Annual summer tournament',
  entry_fee: 50,
  venue: 'City Sports Center',
  max_players: 32,
  registration_deadline: '2025-05-20',
  courts: null,
  status: 'upcoming',
  tournament_type: 'standard',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

export const mockMatch = (overrides?: Partial<Match>): Match => ({
  id: 'match-1',
  tournament_id: 'tournament-1',
  round: 1,
  match_number: 1,
  player1_id: 'player-1',
  player2_id: 'player-2',
  winner_id: null,
  score_player1: 0,
  score_player2: 0,
  court_number: null,
  status: 'scheduled',
  next_match_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

export const mockRegistration = (overrides?: Partial<TournamentRegistration>): TournamentRegistration => ({
  id: 'registration-1',
  tournament_id: 'tournament-1',
  team_id: 'team-1',
  player_id: 'player-1',
  coach_id: 'coach-1',
  status: 'pending',
  payment_status: 'unpaid',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

/**
 * Helper to create FormData from object
 */
export function createFormData(data: Record<string, any>): FormData {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value))
    }
  })
  return formData
}

/**
 * Helper to wait for async updates
 */
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
