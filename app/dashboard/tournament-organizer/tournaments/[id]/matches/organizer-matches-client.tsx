'use client'

import { useState, useMemo } from 'react'
import { Tournament, Match, Team } from '@/types/models'

import { Card, CardContent } from '@/components/ui/card'
import { CourtManager } from '@/components/tournaments/court-manager'
import { useAdminChannel } from '@/lib/realtime/admin-channel'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

interface OrganizerMatchesClientProps {
  tournament: Tournament
  matches: Match[]
  participants: any[]
}

export function OrganizerMatchesClient({ tournament, matches, participants }: OrganizerMatchesClientProps) {
  useAdminChannel(tournament.id)

  // Calculate current tournament day
  const getCurrentDay = (): number => {
    if (!tournament.start_date) return 1
    
    const startDate = new Date(tournament.start_date)
    startDate.setHours(0, 0, 0, 0)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // If tournament hasn't started yet, show Day 1
    if (daysDiff < 0) return 1
    
    // Day number is 1-indexed
    return daysDiff + 1
  }

  // Get unique days from matches
  const availableDays = useMemo(() => {
    const days = new Set<number>()
    matches.forEach(m => {
      if (m.day_number !== null) {
        days.add(m.day_number)
      }
    })
    return Array.from(days).sort((a, b) => a - b)
  }, [matches])

  const currentDay = getCurrentDay()
  const [selectedDay, setSelectedDay] = useState<number>(
    availableDays.includes(currentDay) ? currentDay : (availableDays[0] || 1)
  )

  // Filter matches for selected day
  const dayMatches = useMemo(() => {
    return matches.filter(m => m.day_number === selectedDay)
  }, [matches, selectedDay])

  // Count matches per day for badge display
  const matchCountPerDay = useMemo(() => {
    const counts = new Map<number, number>()
    matches.forEach(m => {
      if (m.day_number !== null) {
        counts.set(m.day_number, (counts.get(m.day_number) || 0) + 1)
      }
    })
    return counts
  }, [matches])

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Day Selector - Only show if multi-day tournament */}
      {availableDays.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">Tournament Day:</span>
              <Tabs value={selectedDay.toString()} onValueChange={(v) => setSelectedDay(parseInt(v))}>
                <TabsList>
                  {availableDays.map(day => (
                    <TabsTrigger key={day} value={day.toString()} className="relative">
                      Day {day}
                      {day === currentDay && (
                        <Badge variant="default" className="ml-2 h-4 px-1 text-[10px]">
                          Today
                        </Badge>
                      )}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({matchCountPerDay.get(day) || 0})
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Live Courts</h2>
            {availableDays.length > 1 && (
              <span className="text-sm text-muted-foreground">
                Showing {dayMatches.length} matches for Day {selectedDay}
              </span>
            )}
          </div>
          <CourtManager 
            tournament={tournament} 
            matches={dayMatches} 
            participants={participants} 
          />
        </CardContent>
      </Card>
    </div>
  )
}

