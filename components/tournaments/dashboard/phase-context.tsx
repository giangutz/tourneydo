"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Tournament } from '@/types/models'
import { calculateTournamentPhase, TournamentPhase } from '@/lib/utils/tournament-phases'

export type DashboardPhase = TournamentPhase

interface PhaseContextType {
  currentPhase: DashboardPhase
  setManualPhase: (phase: DashboardPhase | null) => void
  isManualOverride: boolean
  autoDetectedPhase: DashboardPhase
}

const PhaseContext = createContext<PhaseContextType | undefined>(undefined)

interface PhaseProviderProps {
  children: React.ReactNode
  tournament: Tournament
}

export function PhaseProvider({ children, tournament }: PhaseProviderProps) {
  const [manualPhase, setManualPhase] = useState<DashboardPhase | null>(null)
  const [autoPhase, setAutoPhase] = useState<DashboardPhase>('upcoming')

  useEffect(() => {
    setAutoPhase(calculateTournamentPhase(tournament))
  }, [tournament])

  const value = {
    currentPhase: manualPhase || autoPhase,
    setManualPhase,
    isManualOverride: !!manualPhase,
    autoDetectedPhase: autoPhase
  }

  return (
    <PhaseContext.Provider value={value}>
      {children}
    </PhaseContext.Provider>
  )
}

export function usePhase() {
  const context = useContext(PhaseContext)
  if (context === undefined) {
    throw new Error('usePhase must be used within a PhaseProvider')
  }
  return context
}
