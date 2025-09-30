"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Search, MoreHorizontal, Edit, Trash2, Eye, EyeOff, Plus, Calendar, MapPin, Users } from "lucide-react";
import { createClerkSupabaseClient } from "@/lib/supabase";
import { useUser, useSession } from "@clerk/nextjs";
import type { Tournament } from "@/types/database";

interface TournamentWithCount extends Tournament {
  participantCount: number;
}

export default function ManageTournamentsPage() {
  const router = useRouter();
  const { user } = useUser();
  const { session } = useSession();
  const [tournaments, setTournaments] = useState<TournamentWithCount[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<TournamentWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<TournamentWithCount | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchTournaments();
    }
  }, [user?.id]);

  useEffect(() => {
    const filtered = tournaments.filter(tournament =>
      tournament.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tournament.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tournament.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTournaments(filtered);
  }, [tournaments, searchTerm]);

  const fetchTournaments = async () => {
    if (!user?.id || !session) return;

    try {
      const supabase = createClerkSupabaseClient(session);

      const { data: tournamentsData } = await supabase
        .from('tournaments')
        .select('*')
        .eq('organizer_id', user.id)
        .order('created_at', { ascending: false });

      // Get participant counts for each tournament
      const tournamentsWithCounts = await Promise.all(
        (tournamentsData || []).map(async (tournament: any) => {
          const { count: participantCount } = await supabase
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', tournament.id);

          return {
            ...tournament,
            participantCount: participantCount || 0
          };
        })
      );

      setTournaments(tournamentsWithCounts);
      setFilteredTournaments(tournamentsWithCounts);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (tournamentId: string, newStatus: string) => {
    if (!session) return;

    try {
      const supabase = createClerkSupabaseClient(session);

      const { error } = await supabase
        .from('tournaments')
        .update({ status: newStatus })
        .eq('id', tournamentId);

      if (error) throw error;

      // Refresh the tournaments list
      await fetchTournaments();
    } catch (error) {
      console.error('Error updating tournament status:', error);
    }
  };

  const handleDelete = async () => {
    if (!tournamentToDelete || !session) return;

    try {
      const supabase = createClerkSupabaseClient(session);

      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentToDelete.id);

      if (error) throw error;

      // Refresh the tournaments list
      await fetchTournaments();
      setDeleteDialogOpen(false);
      setTournamentToDelete(null);
    } catch (error) {
      console.error('Error deleting tournament:', error);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'published':
      case 'registration_open':
      case 'registration_closed':
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <SidebarProvider defaultOpen={false}>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading tournaments...</p>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h1 className="text-xl font-semibold truncate">Manage Tournaments</h1>
            </div>
            <Button
              onClick={() => router.push('/dashboard/tournaments/create')}
              className="bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Tournament
            </Button>
          </header>

          <div className="flex-1 space-y-6 p-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tournaments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {filteredTournaments.length} of {tournaments.length} tournaments
              </div>
            </div>

            {/* Tournaments Grid */}
            {filteredTournaments.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredTournaments.map((tournament) => (
                  <Card key={tournament.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{tournament.title}</CardTitle>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{tournament.location}</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/tournaments/${tournament.id}/edit`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {tournament.status === 'draft' ? (
                              <DropdownMenuItem onClick={() => handleStatusChange(tournament.id, 'published')}>
                                <Eye className="mr-2 h-4 w-4" />
                                Publish
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleStatusChange(tournament.id, 'draft')}>
                                <EyeOff className="mr-2 h-4 w-4" />
                                Unpublish
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setTournamentToDelete(tournament);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant={getStatusBadgeVariant(tournament.status)}>
                          {formatStatus(tournament.status)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {tournament.participantCount} registered
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                          </span>
                        </div>

                        {tournament.max_participants && (
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>Max {tournament.max_participants} participants</span>
                          </div>
                        )}

                        {tournament.registration_fee && (
                          <div className="text-sm font-medium">
                            Fee: ${tournament.registration_fee} {tournament.currency}
                          </div>
                        )}
                      </div>

                      {tournament.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {tournament.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">
                  {searchTerm ? 'No tournaments found' : 'No tournaments created yet'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm
                    ? 'Try adjusting your search terms'
                    : 'Create your first tournament to get started'
                  }
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => router.push('/dashboard/tournaments/create')}
                    className="bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Tournament
                  </Button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tournament</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{tournamentToDelete?.title}"? This action cannot be undone and will remove all associated registrations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete Tournament
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
