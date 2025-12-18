'use client'

import { useState } from 'react'
import { Tournament } from '@/types/models'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Calendar, MapPin, Users, Trophy } from 'lucide-react'
import Link from 'next/link'
import { routes } from '@/config/routes'
import { formatShortDate } from '@/lib/utils'
import { deleteTournament } from '@/lib/actions/tournaments'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/ui/empty-state'

interface TournamentListTabsProps {
  tournaments: Tournament[]
  userId: string
}

export function TournamentListTabs({ tournaments }: TournamentListTabsProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Categorize tournaments
  const pastTournaments = tournaments.filter(t => t.status === 'completed' || t.status === 'cancelled')
  const activeTournaments = tournaments.filter(t => t.status !== 'completed' && t.status !== 'cancelled')

  const handleDelete = async (id: string, name: string) => {
    setIsDeleting(true)
    try {
      const result = await deleteTournament(id)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`Tournament "${name}" deleted`)
      }
    } catch (e) {
      toast.error('Failed to delete tournament')
    } finally {
      setIsDeleting(false)
    }
  }

  const TournamentCard = ({ tournament, isPast = false }: { tournament: Tournament, isPast?: boolean }) => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <div>
            <CardTitle>{tournament.name}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              {tournament.start_date ? formatShortDate(tournament.start_date) : 'Date TBD'}
            </CardDescription>
          </div>
          <div className="text-xs px-2 py-1 rounded-full bg-muted font-medium capitalize">
            {tournament.status}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 text-xs text-muted-foreground mb-4 flex-wrap">
            {tournament.venue && (
                 <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{tournament.venue}</span>
                 </div>
            )}
            <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{tournament.max_players ? `${tournament.max_players} max` : 'Open'}</span>
            </div>
        </div>
        
        <div className="flex gap-2">
          {!isPast && (
             <Button className="flex-1" asChild>
                <Link href={routes.organizer.tournamentDetail(tournament.id)}>
                    Manage
                </Link>
             </Button>
          )}
          
          {!isPast && (
            <Button variant="outline" size="icon" asChild>
                <Link href={routes.organizer.tournamentEdit(tournament.id)}>
                    <Pencil className="h-4 w-4" />
                </Link>
            </Button>
          )}
          
          {isPast && (
             <Button className="flex-1" variant="secondary" asChild>
                <Link href={routes.organizer.tournamentDetail(tournament.id)}>
                    View Results
                </Link>
             </Button>
          )}

          {!isPast && (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Tournament?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete "{tournament.name}" and all registration data. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => handleDelete(tournament.id, tournament.name)}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6 max-w-[400px]">
        <TabsTrigger value="active">Active ({activeTournaments.length})</TabsTrigger>
        <TabsTrigger value="past">Past ({pastTournaments.length})</TabsTrigger>
      </TabsList>
      
      <TabsContent value="active" className="space-y-6">
        {activeTournaments.length === 0 ? (
            <EmptyState
                icon={Trophy}
                title="No active tournaments"
                description="Create a new tournament to get started."
                action={{
                    label: 'Create Tournament',
                    href: routes.organizer.tournamentNew,
                }}
            />
        ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeTournaments.map(t => (
                    <TournamentCard key={t.id} tournament={t} />
                ))}
            </div>
        )}
      </TabsContent>
      
      <TabsContent value="past" className="space-y-6">
        {pastTournaments.length === 0 ? (
             <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                <Trophy className="mx-auto h-8 w-8 mb-3 opacity-50" />
                <h3 className="text-lg font-medium mb-1">No past tournaments</h3>
                <p>Completed tournaments will be archived here.</p>
             </div>
        ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pastTournaments.map(t => (
                    <TournamentCard key={t.id} tournament={t} isPast />
                ))}
            </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
