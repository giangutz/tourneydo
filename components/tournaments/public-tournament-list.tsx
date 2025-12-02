import { Tournament } from "@/types/models"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Users, DollarSign, ArrowRight } from "lucide-react"
import { formatShortDate, formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { EmptyState } from "@/components/ui/empty-state"
import { Trophy } from "lucide-react"

interface PublicTournamentListProps {
  tournaments: Tournament[]
}

export function PublicTournamentList({ tournaments }: PublicTournamentListProps) {
  if (tournaments.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No tournaments found"
        description="Try adjusting your search or filters to find what you're looking for."
      />
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="tournament-list">
      {tournaments.map((tournament) => (
        <Card key={tournament.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start gap-2">
              <CardTitle className="line-clamp-1">{tournament.name}</CardTitle>
              <Badge variant={
                tournament.status === 'upcoming' ? 'default' :
                tournament.status === 'ongoing' ? 'secondary' :
                'outline'
              }>
                {tournament.status}
              </Badge>
            </div>
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
                  <DollarSign className="h-4 w-4" />
                  <span>{tournament.entry_fee ? formatCurrency(tournament.entry_fee) : 'Free'}</span>
                </div>

                {tournament.max_players && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Max {tournament.max_players}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href={`/tournaments/${tournament.id}`}>
                View Details <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
