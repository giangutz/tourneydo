'use client'

import { useState } from 'react'
import { Tournament } from '@/types/models'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Pencil, 
  Trash2, 
  Calendar, 
  MapPin, 
  Users, 
  Trophy, 
  MoreVertical, 
  Search,
  ArrowRight
} from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { EmptyState } from '@/components/ui/empty-state'

interface TournamentListTabsProps {
  tournaments: Tournament[]
  userId: string
}

export function TournamentListTabs({ tournaments, userId }: TournamentListTabsProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [tournamentToDelete, setTournamentToDelete] = useState<{id: string, name: string} | null>(null)
  
  // Deduplicate tournaments by ID (in case of duplicate records in DB)
  const uniqueTournaments = tournaments.reduce((acc, tournament) => {
    if (!acc.find(t => t.id === tournament.id)) {
      acc.push(tournament)
    }
    return acc
  }, [] as typeof tournaments)

  // Filter based on search
  const filteredTournaments = uniqueTournaments.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.venue?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // Categorize tournaments
  const pastTournaments = filteredTournaments.filter(t => t.status === 'completed' || t.status === 'cancelled')
  const activeTournaments = filteredTournaments.filter(t => t.status !== 'completed' && t.status !== 'cancelled')

  const handleDelete = async () => {
    if (!tournamentToDelete) return
    
    setIsDeleting(true)
    try {
      const result = await deleteTournament(tournamentToDelete.id)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`Tournament "${tournamentToDelete.name}" deleted`)
        setTournamentToDelete(null)
      }
    } catch (e) {
      toast.error('Failed to delete tournament')
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      case 'ongoing': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800'
      case 'completed': return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300 border-slate-200 dark:border-slate-800'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const TournamentCard = ({ tournament, isPast = false }: { tournament: Tournament, isPast?: boolean }) => {
    const isOwner = tournament.organizer_id === userId
    
    return (
      <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
             tournament.status === 'ongoing' ? 'bg-green-500' : 
             tournament.status === 'upcoming' ? 'bg-blue-500' : 'bg-slate-300'
        }`} />
        
        <CardHeader className="pl-6 pb-3">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 mb-2">
                 <Badge variant="outline" className={`capitalize rounded-md px-2 py-0.5 text-xs font-semibold ${getStatusColor(tournament.status)} border`}>
                    {tournament.status}
                 </Badge>
                 {tournament.status === 'ongoing' && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                 )}
               </div>
              <CardTitle className="line-clamp-2 text-lg sm:text-xl leading-tight group-hover:text-primary transition-colors">
                {tournament.name}
              </CardTitle>
            </div>
            
            {/* Actions Menu */}
            {!isPast && isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                       <Link href={routes.organizer.tournamentEdit(tournament.id)} className="cursor-pointer">
                          <Pencil className="mr-2 h-4 w-4" /> Edit Details
                       </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        className="text-destructive focus:text-destructive cursor-pointer"
                        onClick={() => setTournamentToDelete({ id: tournament.id, name: tournament.name })}
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pl-6 pb-2">
            <div className="grid gap-2 text-sm text-muted-foreground">
                 <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary/70" />
                    <span>{tournament.start_date ? formatShortDate(tournament.start_date) : 'Date TBD'}</span>
                 </div>
                 {tournament.venue && (
                   <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary/70" />
                      <span className="truncate">{tournament.venue}</span>
                   </div>
                 )}
                 <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary/70" />
                      <span>{tournament.max_players ? `${tournament.max_players} Athletes Max` : 'Open Registration'}</span>
                 </div>
            </div>
        </CardContent>
        
        <CardFooter className="pl-6 pt-4">
             {!isPast ? (
                <Button className="w-full group-hover:bg-primary/90 transition-colors" asChild>
                  <Link href={routes.organizer.tournamentDetail(tournament.id)}>
                      Manage Tournament <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
             ) : (
                <Button variant="secondary" className="w-full" asChild>
                  <Link href={routes.organizer.tournamentDetail(tournament.id)}>
                      View Results
                  </Link>
                </Button>
             )}
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
       {/* Search Bar */}
       <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search tournaments by name or venue..." 
            className="pl-9 w-full sm:max-w-[400px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
       </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 sm:w-[400px]">
          <TabsTrigger value="active">Active ({activeTournaments.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastTournaments.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-6">
          {activeTournaments.length === 0 ? (
              <EmptyState
                  icon={Trophy}
                  title={searchQuery ? "No matching tournaments" : "No active tournaments"}
                  description={searchQuery ? "Try a different search term" : "Create a new tournament to get started."}
                  action={!searchQuery ? {
                      label: 'Create Tournament',
                      href: routes.organizer.tournamentNew,
                  } : undefined}
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

      <AlertDialog open={!!tournamentToDelete} onOpenChange={(open) => !open && setTournamentToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Tournament?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete "{tournamentToDelete?.name}" and all registration data. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={handleDelete}
                    disabled={isDeleting}
                >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
