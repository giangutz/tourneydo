'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, Printer, Users } from 'lucide-react'
import Link from 'next/link'

interface ParticipantsListProps {
  teamMap: Map<string, any[]>
  coachMap: Map<string, any>
  tournamentId: string
  divisions: any[]
}

export function ParticipantsList({ teamMap, coachMap, tournamentId, divisions }: ParticipantsListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Helper function to get division label matching bracket view
  const getDivisionLabel = (divisionId: string | null, categoryId: string | null): string => {
    if (!divisionId || !categoryId) return ''
    
    const division = divisions.find(d => d.id === divisionId)
    if (!division) return ''

    const category = (division as any).tournament_categories?.find(
      (c: any) => c.id === categoryId
    )
    
    if (!category) return ''

    // Normalize category name (FEATHER -> Feather)
    const categoryName = category.name.charAt(0).toUpperCase() + category.name.slice(1).toLowerCase()
    
    // Determine if it's a youth division (Cadet or Gradeschool)
    const isYouth = division.name.toLowerCase().includes('cadet') || division.name.toLowerCase().includes('gradeschool')
    
    // Determine gender label
    let genderLabel = ''
    if (category.gender === 'male') {
      genderLabel = isYouth ? 'Boys' : 'Men'
    } else if (category.gender === 'female') {
      genderLabel = isYouth ? 'Girls' : 'Women'
    }

    return `${division.name} ${genderLabel} - ${categoryName}`.trim()
  }

  // Filter teams based on search query
  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) {
      return Array.from(teamMap.entries())
    }

    const query = searchQuery.toLowerCase()
    return Array.from(teamMap.entries()).filter(([teamId, teamParticipants]) => {
      const team = teamParticipants[0]?.team
      if (!team) return false

      // Search by team name
      if (team.name.toLowerCase().includes(query)) return true

      // Search by coach name
      const teamCoach = coachMap.get(teamId)
      if (teamCoach?.name.toLowerCase().includes(query)) return true

      // Search by player name
      const hasMatchingPlayer = teamParticipants.some(p => {
        const fullName = `${p.player?.first_name} ${p.player?.last_name}`.toLowerCase()
        return fullName.includes(query)
      })

      return hasMatchingPlayer
    })
  }, [teamMap, coachMap, searchQuery])

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by team, coach, or player name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Results count */}
      {searchQuery && (
        <div className="text-sm text-muted-foreground">
          Found {filteredTeams.length} {filteredTeams.length === 1 ? 'team' : 'teams'}
        </div>
      )}

      {/* Teams List */}
      {filteredTeams.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No teams found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Try adjusting your search query.' : 'No teams registered yet.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredTeams.map(([teamId, teamParticipants]) => {
            const team = teamParticipants[0]?.team
            if (!team) return null
            
            // Get coach for this team using team ID
            const teamCoach = coachMap.get(team.id)
            
            return (
              <Card key={teamId} className="border-2">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <CardDescription>
                      {teamParticipants.length} {teamParticipants.length === 1 ? 'registered player' : 'registered players'}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/tournaments/${tournamentId}/print-ids?teamId=${team.id}`} target="_blank">
                      <Printer className="mr-2 h-4 w-4" />
                      Print IDs
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {/* Coach Card */}
                  {teamCoach && (
                    <div className="mb-4 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                      <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-base">{teamCoach.name}</span>
                            <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
                              Coach
                            </Badge>
                          </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Players Grid */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {teamParticipants.map((p) => (
                      <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate mb-1">
                            {p.player?.first_name} {p.player?.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {p.player?.belt_level && (
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-xs">
                                  {p.player.belt_level}
                                </Badge>
                              </div>
                            )}
                            {p.division_id && p.category_id && (
                              <div className="text-xs font-medium text-primary mt-1.5 line-clamp-2">
                                {getDivisionLabel(p.division_id, p.category_id)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
