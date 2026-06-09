'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, ChevronLeft, ChevronRight, Users, Shield } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Participant {
  id: string
  status: string
  players: {
    first_name: string
    last_name: string
    belt_level?: string
    avatar_url?: string
  }
  teams?: {
    id: string
    name: string
  } | null
}

interface PublicParticipantListProps {
  participants: any[] // Using any to match parent, but internal type is Participant
}

export function PublicParticipantList({ participants }: PublicParticipantListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 9

  // Filter and Group Participants
  const groupedTeams = useMemo(() => {
    // 1. Filter
    const query = searchQuery.toLowerCase()
    const filtered = participants.filter((p: Participant) => {
      const fullName = `${p.players.first_name} ${p.players.last_name}`.toLowerCase()
      const teamName = p.teams?.name?.toLowerCase() || ''
      
      return fullName.includes(query) || teamName.includes(query)
    })

    // 2. Group by Team
    const groups = new Map<string, { teamName: string; members: Participant[] }>()

    filtered.forEach((p: Participant) => {
      const teamId = p.teams?.id || 'unattached'
      const teamName = p.teams?.name || 'Unattached'

      if (!groups.has(teamId)) {
        groups.set(teamId, { teamName, members: [] })
      }
      groups.get(teamId)!.members.push(p)
    })

    // 3. Convert to Array and Sort
    return Array.from(groups.values()).sort((a, b) => {
      // Put Unattached at the end
      if (a.teamName === 'Unattached') return 1
      if (b.teamName === 'Unattached') return -1
      return a.teamName.localeCompare(b.teamName)
    })
  }, [participants, searchQuery])

  // Pagination Logic
  const totalPages = Math.ceil(groupedTeams.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentTeams = groupedTeams.slice(startIndex, startIndex + itemsPerPage)

  // Reset page when search changes
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages))
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex w-full max-w-sm items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search players or teams..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {groupedTeams.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
          <Users className="mx-auto h-8 w-8 mb-3 opacity-50" />
          <h3 className="text-lg font-medium mb-1">No participants found</h3>
          <p>Try adjusting your search query.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {currentTeams.map((group) => (
            <Card key={group.teamName} className="flex flex-col h-full overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-base font-semibold truncate" title={group.teamName}>
                    {group.teamName}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                 <ScrollArea className="h-[200px] w-full p-4">
                  <div className="space-y-3">
                    {group.members.map((p) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {p.players.first_name[0]}{p.players.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-medium truncate">
                            {p.players.first_name} {p.players.last_name}
                          </span>
                          {p.players.belt_level && (
                            <span className="text-[10px] text-muted-foreground truncate uppercase tracking-wider">
                              {p.players.belt_level} Belt
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="bg-muted/10 border-t p-2 text-xs text-center text-muted-foreground">
                  {group.members.length} {group.members.length === 1 ? 'Player' : 'Players'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 pt-4 border-t">
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
