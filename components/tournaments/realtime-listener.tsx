'use client'

import { useAdminChannel } from '@/lib/realtime/admin-channel'

interface RealtimeListenerProps {
  tournamentId: string
}

export function RealtimeListener({ tournamentId }: RealtimeListenerProps) {
  useAdminChannel(tournamentId)
  return null
}
