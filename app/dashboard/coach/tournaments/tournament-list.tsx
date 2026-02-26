"use client"

import { useState } from "react"
import { Tournament, TournamentRegistration } from "@/types/models"
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
  Eye,
  PhilippinePeso,
  MapPin,
  Trophy,
  Users,
  Clock,
  Printer,
  Search,
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
import { formatShortDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"

interface TournamentListProps {
  tournaments: Tournament[]
  registrations: TournamentRegistration[]
  coachId: string
}

export function TournamentList({ tournaments, registrations, coachId }: TournamentListProps) {
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
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative w-full sm:flex-1">
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
        <div className="grid gap-6 md:grid-cols-2">
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
              {registrations.some(
                r => r.tournament_id === tournament.id && r.status === 'pending'
              ) && (
                <Link href={`/dashboard/coach/tournaments/${tournament.id}/payment`} className="flex-1">
                  <Button className="bg-green-600 hover:bg-green-700 text-white w-full" size="sm">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Make Payment
                  </Button>
                </Link>
              )}
              
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

