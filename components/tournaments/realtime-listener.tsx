'use client'

import { useTournamentRealtime } from '@/hooks/use-tournament-realtime'

interface RealtimeListenerProps {
  tournamentId: string
}

export function RealtimeListener({ tournamentId }: RealtimeListenerProps) {
  useTournamentRealtime(tournamentId)
  return null
}
