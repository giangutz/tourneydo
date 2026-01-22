"use client"

import { useState } from "react"
import { Tournament, Team, Player, TournamentRegistration } from "@/types/models"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Eye, 
  PhilippinePeso, 
  Calendar, 
  MapPin, 
  Trophy, 
  Users, 
  Clock, 
  Printer, 
  Search,
  Loader2, 
  Check,
  CreditCard
} from "lucide-react"
import Link from "next/link"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatShortDate, formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { registerTeam } from "./actions"
import { getTeamPlayers } from "@/lib/actions/teams"
import { useRouter } from "next/navigation"
import { EmptyState } from "@/components/ui/empty-state"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface TournamentListProps {
  tournaments: Tournament[]
  teams: Team[]
  registrations: TournamentRegistration[]
  coachId: string
}

export function TournamentList({ tournaments, teams, registrations, coachId }: TournamentListProps) {
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [openDialogId, setOpenDialogId] = useState<string | null>(null)
  const router = useRouter()

  const handleTeamSelect = async (teamId: string, tournamentId: string) => {
    setSelectedTeam(teamId)
    setSelectedPlayers([])
    setTeamPlayers([])
    
    if (!teamId) return

    setIsLoadingPlayers(true)
    try {
      const players = await getTeamPlayers(teamId)
      setTeamPlayers(players)
      
      // Check for existing registrations for this team and tournament
      const existingTeamRegistrations = registrations.filter(
        r => r.tournament_id === tournamentId && r.team_id === teamId
      )

      if (existingTeamRegistrations.length > 0) {
        // Pre-select registered players
        setSelectedPlayers(existingTeamRegistrations.map(r => r.player_id))
      } else {
        // Default to selecting all players if no existing registration
        setSelectedPlayers(players.map(p => p.id))
      }
    } catch (error) {
      console.error("Failed to fetch players", error)
      toast.error("Failed to fetch team players")
    } finally {
      setIsLoadingPlayers(false)
    }
  }

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    )
  }

  const handleRegister = async (tournamentId: string) => {
    if (!selectedTeam) return

    setIsRegistering(true)
    const playersToRegister = selectedPlayers // Capture before clearing state
    try {
      const result = await registerTeam(tournamentId, selectedTeam, playersToRegister)
      if (result.success) {
        setOpenDialogId(null)
        setSelectedTeam("")
        setTeamPlayers([])
        setSelectedPlayers([])
        toast.success(playersToRegister.length === 0 ? "Unregistered successfully!" : "Registration updated successfully!")
      } else {
        toast.error(result.error || "Failed to register team")
        console.error(result.error)
      }
    } catch (error) {
      console.error("Failed to register", error)
    } finally {
      setIsRegistering(false)
    }
  }

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("upcoming")

  // Filter tournaments
  const filteredTournaments = tournaments.filter(t => {
    // Search
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    // Status
    if (statusFilter !== "all" && t.status !== statusFilter) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-[300px]">
           <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
           <Input
            placeholder="Search tournaments..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
           <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="all">All Tournaments</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredTournaments.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No tournaments found"
          description={
            statusFilter === "all" 
              ? "No tournaments match your search." 
              : `No ${statusFilter} tournaments found.`
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTournaments.map((tournament) => (
        <Card key={tournament.id} className="flex flex-col">
          <CardHeader>
            <CardTitle className="line-clamp-1">{tournament.name}</CardTitle>
            <CardDescription>
              {tournament.start_date ? formatShortDate(tournament.start_date) : 'TBD'} 
              {tournament.end_date && ` - ${formatShortDate(tournament.end_date)}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4 text-sm text-muted-foreground">
              {tournament.description && (
                <p className="line-clamp-2">{tournament.description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                {tournament.venue && (
                  <div className="flex items-center gap-2 col-span-2">
                    <MapPin className="h-4 w-4" />
                    <span>{tournament.venue}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <PhilippinePeso className="h-4 w-4" />
                  <span>{tournament.entry_fee ? tournament.entry_fee.toFixed(2) : 'Free'}</span>
                </div>

                {tournament.max_players && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{tournament.max_players} Players</span>
                  </div>
                )}

                {tournament.registration_deadline && (
                  <div className="flex items-center gap-2 col-span-2 text-orange-600">
                    <Clock className="h-4 w-4" />
                    <span>Register by {formatShortDate(tournament.registration_deadline)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <Badge variant={tournament.status === 'upcoming' ? 'default' : 'secondary'}>
                  {tournament.status}
                </Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3 items-stretch">
            {/* Registration Status */}
            {registrations.some(r => r.tournament_id === tournament.id) && (
              <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-primary">Registered</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {registrations.filter(r => r.tournament_id === tournament.id).length} {registrations.filter(r => r.tournament_id === tournament.id).length === 1 ? 'player' : 'players'}
                    </div>
                  </div>
                  <Check className="h-5 w-5 text-primary" />
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-between items-center mt-2 flex-wrap">
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link href={`/tournaments/${tournament.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Link>
              </Button>

              {registrations.some(r => r.tournament_id === tournament.id) && (
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href={`/tournaments/${tournament.id}/print-ids?coachId=${coachId}`} target="_blank">
                    <Printer className="h-4 w-4 mr-2" />
                    ID
                  </Link>
                </Button>
              )}

              {/* Payment Button */}
              {(() => {
                const tournamentTeams = Array.from(new Set(registrations.filter(r => r.tournament_id === tournament.id).map(r => r.team_id)))
                
                const unpaidTeams = tournamentTeams.map(teamId => {
                   const teamRegs = registrations.filter(r => r.tournament_id === tournament.id && r.team_id === teamId)
                   const unpaidRegs = teamRegs.filter(r => r.status !== 'paid' && r.status !== 'verified')
                   const amountOwed = unpaidRegs.length * (tournament.entry_fee || 0)
                   
                   return {
                     teamId,
                     amountOwed
                   }
                }).filter(t => t.amountOwed > 0)

                if (unpaidTeams.length === 0) return null

                return (
                  <Link href={`/dashboard/coach/tournaments/${tournament.id}/payment`} className="flex-1">
                    <Button className="bg-green-600 hover:bg-green-700 text-white w-full">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Make Payment
                    </Button>
                  </Link>
                )
              })()}
              
              <Button size="sm" className="flex-1" asChild>
                <Link href={`/dashboard/coach/tournaments/${tournament.id}/register`}>
                  {registrations.some(r => r.tournament_id === tournament.id) ? 'Manage Team' : 'Register'}
                </Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
        </div>
      )}
    </div>
  )
}

