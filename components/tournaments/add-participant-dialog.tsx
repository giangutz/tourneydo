'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Search, UserPlus, Loader2, User } from 'lucide-react'
import { toast } from 'sonner'
import { Team, Player } from '@/types/models'
import { PlayerFormDialog, type PlayerFormData } from '@/components/players/player-form-dialog'
import { useRouter } from 'next/navigation'
import { searchPlayersAction } from '@/lib/actions/players'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useDebouncedCallback } from 'use-debounce'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface AddParticipantDialogProps {
  tournamentId: string
  teams: Team[]
}

export function AddParticipantDialog({ tournamentId, teams }: AddParticipantDialogProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Player[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | undefined>(undefined)
  
  const router = useRouter()

  const handleSearch = useDebouncedCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const result = await searchPlayersAction(query)
      if (result.success && result.data) {
        setSearchResults(result.data)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      toast.error('Failed to search players')
    } finally {
      setIsSearching(false)
    }
  }, 300)

  const handleCreateNew = () => {
    setMenuOpen(false)
    setSelectedPlayer(undefined)
    setFormOpen(true)
  }

  const handleSelectExisting = (player: Player) => {
    setMenuOpen(false)
    setSelectedPlayer(player)
    setFormOpen(true)
  }

  async function handleSubmit(data: PlayerFormData) {
    try {
      const response = await fetch('/api/participants/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId,
          player_id: selectedPlayer?.id, // Pass ID if updating existing
          ...data,
          weight: data.weight ? parseFloat(data.weight) : null,
          height: data.height ? parseFloat(data.height) : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to add participant')
      }

      toast.success(selectedPlayer ? 'Participant added and updated' : 'New participant created and added')
      router.refresh()
      setFormOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to add participant')
      throw error // Re-throw so PlayerFormDialog knows it failed
    }
  }

  return (
    <>
      <Button onClick={() => setMenuOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Participant
      </Button>

      {/* Selection Menu Dialog */}
      <Dialog open={menuOpen} onOpenChange={(open) => {
        setMenuOpen(open)
        if (!open) {
          setSearchQuery('')
          setSearchResults([])
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Participant</DialogTitle>
            <DialogDescription>
              Search for an existing player or create a new one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Search Section */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search existing players..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    handleSearch(e.target.value)
                  }}
                  autoFocus
                />
              </div>
              
              {/* Search Results */}
              {(searchQuery || isSearching) && (
                <div className="border rounded-md mt-2 overflow-hidden bg-background">
                  {isSearching ? (
                    <div className="p-4 flex items-center justify-center text-muted-foreground text-sm">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <ScrollArea className="h-[200px]">
                      <div className="p-1">
                        {searchResults.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center gap-3 p-2 hover:bg-muted cursor-pointer rounded-sm"
                            onClick={() => handleSelectExisting(player)}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {player.first_name[0]}{player.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {player.first_name} {player.last_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {player.belt_level || 'No Belt'} • {player.email || 'No Email'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : searchQuery ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No players found.
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            <Button 
              className="w-full" 
              variant="outline" 
              onClick={handleCreateNew}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Create New Player
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Player Form Dialog (for both creating new and confirming existing) */}
      <PlayerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={selectedPlayer ? 'edit' : 'add'}
        title={selectedPlayer ? 'Confirm Participant Details' : 'Add New Participant'}
        description={selectedPlayer 
          ? "Verify and update the player's details for this tournament." 
          : "Manually add a player to this tournament. They will be assigned to the selected team."}
        teams={teams}
        showTeamSelector={true}
        player={selectedPlayer}
        onSubmit={handleSubmit}
        submitButtonText={selectedPlayer ? 'Add to Tournament' : 'Add Participant'}
      />
    </>
  )
}
