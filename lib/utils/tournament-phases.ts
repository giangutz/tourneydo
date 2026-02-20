
import { Tournament } from '@/types/models'

export type TournamentPhase = 'upcoming' | 'weigh-in' | 'ongoing' | 'concluded'

export function calculateTournamentPhase(tournament: Tournament): TournamentPhase {
  // 1. Manually Ended
  if (tournament.status === 'completed') {
    return 'concluded'
  }

  // Get current date string in local time (YYYY-MM-DD)
  // We use local time because the user perceives "today" based on their clock
  const now = new Date()
  const today = now.toLocaleDateString('en-CA')

  const startDate = tournament.start_date
  const endDate = tournament.end_date
  const weighInStart = tournament.weigh_in_start
  const weighInEnd = tournament.weigh_in_end

  // 2. Ongoing: Today is within tournament dates
  if (startDate && endDate && today >= startDate && today <= endDate) {
    return 'ongoing'
  }

  // 3. Weigh-In: Today is within weigh-in dates
  if (weighInStart && weighInEnd && today >= weighInStart && today <= weighInEnd) {
    return 'weigh-in'
  }

  // 4. Concluded (Time-based): Today is after end date
  if (endDate && today > endDate) {
    return 'concluded'
  }

  // 5. Explicit Status Overrides (Fallbacks)
  if (tournament.status === 'ongoing') return 'ongoing'

  // 6. Default
  return 'upcoming'
}
