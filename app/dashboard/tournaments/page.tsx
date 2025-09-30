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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Users,
  Calendar,
  MapPin,
  DollarSign,
  Filter,
  Download,
  Upload,
  UserPlus,
  UserMinus,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from "lucide-react";
import { createClerkSupabaseClient } from "@/lib/supabase";
import { useUser, useSession } from "@clerk/nextjs";
import type { Tournament, Athlete, Registration } from "@/types/database";

interface TournamentWithStats extends Tournament {
  participantCount: number;
  confirmedCount: number;
  pendingCount: number;
  revenue: number;
}

interface RegistrationWithAthlete extends Registration {
  athlete: Athlete;
}

export default function TournamentsPage() {
  const router = useRouter();
  const { user } = useUser();
  const { session } = useSession();

  // State management
  const [tournaments, setTournaments] = useState<TournamentWithStats[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<TournamentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [participantsDialogOpen, setParticipantsDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<TournamentWithStats | null>(null);
  const [tournamentToDelete, setTournamentToDelete] = useState<TournamentWithStats | null>(null);
  const [participants, setParticipants] = useState<RegistrationWithAthlete[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  // Load tournaments on mount
  useEffect(() => {
    if (user?.id) {
      fetchTournaments();
    }
  }, [user?.id]);

  // Filter tournaments based on search and status
  useEffect(() => {
    let filtered = tournaments;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(tournament =>
        tournament.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tournament.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tournament.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(tournament => tournament.status === statusFilter);
    }

    setFilteredTournaments(filtered);
  }, [tournaments, searchTerm, statusFilter]);

  const fetchTournaments = async () => {
    if (!user?.id || !session) return;

    try {
      const supabase = createClerkSupabaseClient(session);

      const { data: tournamentsData, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('organizer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get stats for each tournament
      const tournamentsWithStats = await Promise.all(
        (tournamentsData || []).map(async (tournament: any) => {
          // Get registration counts
          const { data: registrations } = await supabase
            .from('registrations')
            .select('status, payment_amount, payment_status')
            .eq('tournament_id', tournament.id);

          const participantCount = registrations?.length || 0;
          const confirmedCount = registrations?.filter(r => r.status === 'confirmed').length || 0;
          const pendingCount = registrations?.filter(r => r.status === 'pending').length || 0;

          // Calculate revenue
          const revenue = registrations?.reduce((sum: number, reg: any) => {
            if (reg.payment_status === 'paid' && reg.payment_amount) {
              return sum + reg.payment_amount;
            }
            return sum;
          }, 0) || 0;

          return {
            ...tournament,
            participantCount,
            confirmedCount,
            pendingCount,
            revenue,
          };
        })
      );

      setTournaments(tournamentsWithStats);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async (tournamentId: string) => {
    if (!session) return;

    setParticipantsLoading(true);
    try {
      const supabase = createClerkSupabaseClient(session);

      const { data: registrations, error } = await supabase
        .from('registrations')
        .select(`
          *,
          athlete:athletes(*)
        `)
        .eq('tournament_id', tournamentId)
        .order('registration_date', { ascending: false });

      if (error) throw error;

      setParticipants(registrations || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setParticipantsLoading(false);
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

      await fetchTournaments();
      setDeleteDialogOpen(false);
      setTournamentToDelete(null);
    } catch (error) {
      console.error('Error deleting tournament:', error);
    }
  };

  const handleViewParticipants = async (tournament: TournamentWithStats) => {
    setSelectedTournament(tournament);
    setParticipantsDialogOpen(true);
    await fetchParticipants(tournament.id);
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

  const getStatusOptions = () => [
    { value: "all", label: "All Status" },
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "registration_open", label: "Registration Open" },
    { value: "registration_closed", label: "Registration Closed" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

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
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Trophy className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <h1 className="text-xl font-semibold truncate">Tournament Management</h1>
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
            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tournaments</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tournaments.length}</div>
                  <p className="text-xs text-muted-foreground">
                    All tournaments created
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {tournaments.reduce((sum, t) => sum + t.participantCount, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across all tournaments
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Events</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {tournaments.filter(t => ['published', 'registration_open', 'in_progress'].includes(t.status)).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Currently active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${tournaments.reduce((sum, t) => sum + t.revenue, 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From paid registrations
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card>
              <CardContent className="pt-6">
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto">
                        <Filter className="mr-2 h-4 w-4" />
                        {getStatusOptions().find(opt => opt.value === statusFilter)?.label || "Filter Status"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {getStatusOptions().map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => setStatusFilter(option.value)}
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>

            {/* Tournaments List */}
            <Card>
              <CardHeader>
                <CardTitle>Tournaments ({filteredTournaments.length})</CardTitle>
                <CardDescription>
                  Manage your tournaments and track participant registrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredTournaments.length > 0 ? (
                  <div className="space-y-4">
                    {filteredTournaments.map((tournament) => (
                      <div key={tournament.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{tournament.title}</h3>
                            <Badge variant={getStatusBadgeVariant(tournament.status)}>
                              {formatStatus(tournament.status)}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {tournament.location}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {tournament.participantCount} participants ({tournament.confirmedCount} confirmed, {tournament.pendingCount} pending)
                            </div>
                            {tournament.revenue > 0 && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                ${tournament.revenue.toFixed(2)}
                              </div>
                            )}
                          </div>

                          {tournament.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {tournament.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewParticipants(tournament)}
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Participants
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">
                      {searchTerm || statusFilter !== "all" ? 'No tournaments found' : 'No tournaments created yet'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm || statusFilter !== "all"
                        ? 'Try adjusting your search or filters'
                        : 'Create your first tournament to get started'
                      }
                    </p>
                    {!searchTerm && statusFilter === "all" && (
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
              </CardContent>
            </Card>
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

      {/* Participants Dialog */}
      <Dialog open={participantsDialogOpen} onOpenChange={setParticipantsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTournament?.title} - Participants ({participants.length})
            </DialogTitle>
            <DialogDescription>
              Manage registrations and participant information
            </DialogDescription>
          </DialogHeader>

          {participantsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading participants...</span>
            </div>
          ) : participants.length > 0 ? (
            <div className="space-y-4">
              <Tabs defaultValue="all" className="w-full">
                <TabsList>
                  <TabsTrigger value="all">All ({participants.length})</TabsTrigger>
                  <TabsTrigger value="confirmed">
                    Confirmed ({participants.filter(p => p.status === 'confirmed').length})
                  </TabsTrigger>
                  <TabsTrigger value="pending">
                    Pending ({participants.filter(p => p.status === 'pending').length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-2">
                  {participants.map((registration) => (
                    <ParticipantCard key={registration.id} registration={registration} />
                  ))}
                </TabsContent>

                <TabsContent value="confirmed" className="space-y-2">
                  {participants
                    .filter(p => p.status === 'confirmed')
                    .map((registration) => (
                      <ParticipantCard key={registration.id} registration={registration} />
                    ))}
                </TabsContent>

                <TabsContent value="pending" className="space-y-2">
                  {participants
                    .filter(p => p.status === 'pending')
                    .map((registration) => (
                      <ParticipantCard key={registration.id} registration={registration} />
                    ))}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No participants registered yet</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

// Participant Card Component
function ParticipantCard({ registration }: { registration: RegistrationWithAthlete }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'pending':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'cancelled':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`p-4 border rounded-lg ${getStatusColor(registration.status)}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon(registration.status)}
          <div>
            <h4 className="font-medium">
              {registration.athlete.first_name} {registration.athlete.last_name}
            </h4>
            <p className="text-sm opacity-75">
              {registration.athlete.belt_rank} • {registration.athlete.date_of_birth ? new Date(registration.athlete.date_of_birth).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>

        <div className="text-right">
          <Badge variant={registration.status === 'confirmed' ? 'default' : 'secondary'}>
            {registration.status}
          </Badge>
          {registration.payment_amount && (
            <p className="text-sm mt-1">
              ${registration.payment_amount} {registration.payment_status === 'paid' ? '✓' : ''}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 text-sm opacity-75">
        Registered: {new Date(registration.registration_date).toLocaleDateString()}
        {registration.notes && (
          <span className="ml-4">• {registration.notes}</span>
        )}
      </div>
    </div>
  );
}
