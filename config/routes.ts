/**
 * Route definitions
 * 
 * Centralized route constants to prevent typos and make refactoring easier
 */

export const routes = {
  // Public routes
  home: '/',
  signIn: '/sign-in',
  signUp: '/sign-up',
  register: '/dashboard/coach/tournaments',
  publicTournament: (id: string) => `/tournaments/${id}`,

  // Onboarding
  onboarding: '/onboarding',

  // Coach routes
  coach: {
    dashboard: '/dashboard/coach',
    teams: '/dashboard/coach/teams',
    teamNew: '/dashboard/coach/teams/new',
    teamDetail: (id: string) => `/dashboard/coach/teams/${id}`,
    players: '/dashboard/coach/players',
    playerNew: '/dashboard/coach/players/new',
    playerDetail: (id: string) => `/dashboard/coach/players/${id}`,
    tournaments: '/dashboard/coach/tournaments',
  },

  // Tournament Organizer routes
  organizer: {
    dashboard: '/dashboard/tournament-organizer',
    tournaments: '/dashboard/tournament-organizer/tournaments',
    tournamentNew: '/dashboard/tournament-organizer/tournaments/new',
    tournamentDetail: (id: string) => `/dashboard/tournament-organizer/tournaments/${id}`,
    tournamentEdit: (id: string) => `/dashboard/tournament-organizer/tournaments/${id}/edit`,
    tournamentParticipants: (id: string) => `/dashboard/tournament-organizer/tournaments/${id}/participants`,
    tournamentBracket: (id: string) => `/dashboard/tournament-organizer/tournaments/${id}/bracket`,
    tournamentMatches: (id: string) => `/dashboard/tournament-organizer/tournaments/${id}/matches`,
    weighIn: (id: string) => `/dashboard/tournament-organizer/tournaments/${id}/random-weigh-in`,
    participantWeighIn: (id: string, registrationId: string) => `/dashboard/tournament-organizer/tournaments/${id}/random-weigh-in/${registrationId}`,
    staff: (id: string) => `/dashboard/tournament-organizer/tournaments/${id}/staff`,
    schedule: (id: string) => `/dashboard/tournament-organizer/tournaments/${id}/schedule`,
    athletes: '/dashboard/tournament-organizer/athletes',
  },
} as const

/**
 * Get dashboard route based on user role
 */
export function getDashboardRoute(role: 'coach' | 'tournament-organizer'): string {
  return role === 'coach' ? routes.coach.dashboard : routes.organizer.dashboard
}
