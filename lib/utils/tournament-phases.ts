
import { Tournament } from '@/types/models'

export type TournamentPhase = 'upcoming' | 'weigh-in' | 'ongoing' | 'concluded'

export function calculateTournamentPhase(tournament: Tournament): TournamentPhase {
  const now = new Date()

  // If manually concluded by organizer
  if (tournament.status === 'completed' && tournament.end_date && new Date(tournament.end_date) < now) {
    return 'concluded'
  }

  // Check dates
  const weighInStart = tournament.weigh_in_start ? new Date(tournament.weigh_in_start) : null
  const weighInEnd = tournament.weigh_in_end ? new Date(tournament.weigh_in_end) : null
  const tournamentEnd = tournament.end_date ? new Date(tournament.end_date) : null

  // Upcoming: Before weigh-in start OR status is explicitly upcoming
  // Note: If no dates are set, we rely on status.
  if (tournament.status === 'upcoming') {
    // If weigh-in start is passed, we might technically be in weigh-in, 
    // but if status says upcoming, maybe stick to upcoming unless dynamic override is desired everywhere.
    // The original logic checked dates first, let's preserve that preference for dates.
  }

  // Upcoming: Before weigh-in start
  if (weighInStart && now < weighInStart) {
    return 'upcoming'
  }

  // Weigh-In: During weigh-in period
  if (weighInStart && weighInEnd && now >= weighInStart && now <= weighInEnd) {
    return 'weigh-in'
  }

  // Ongoing: Weigh-in End Date < Current Date <= Tournament End Date
  if (weighInEnd && tournamentEnd && now > weighInEnd && now <= tournamentEnd) {
    return 'ongoing'
  }

  // Fallback logic if dates are missing but status indicates something
  if (tournament.status === 'ongoing') return 'ongoing'
  if (tournament.status === 'completed') return 'concluded'

  // Default
  return 'upcoming'
}
