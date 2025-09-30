"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ArrowLeft,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Settings,
  UserCheck,
  UserX,
  Share2,
  Copy,
  Check
} from "lucide-react";
import { createClerkSupabaseClient } from "@/lib/supabase";
import { useUser, useSession } from "@clerk/nextjs";
import type { Tournament, Registration, Athlete } from "@/types/database";

interface TournamentWithStats extends Tournament {
  participantCount: number;
  confirmedCount: number;
  pendingCount: number;
  revenue: number;
}

interface RegistrationWithAthlete extends Registration {
  athlete: Athlete;
}

export default function TournamentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tournamentId = params.id as string;

  const { user } = useUser();
  const { session } = useSession();

  // State management
  const [tournament, setTournament] = useState<TournamentWithStats | null>(null);
  const [participants, setParticipants] = useState<RegistrationWithAthlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load tournament data
  useEffect(() => {
    if (user?.id && tournamentId) {
      fetchTournament();
      fetchParticipants();
    }
  }, [user?.id, tournamentId]);

  const fetchTournament = async () => {
    if (!user?.id || !session || !tournamentId) return;

    try {
      const supabase = createClerkSupabaseClient(session);

      const { data: tournamentData, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .eq('organizer_id', user.id)
        .single();

      if (error) throw error;

      // Get registration stats
      const { data: registrations } = await supabase
        .from('registrations')
        .select('status, payment_amount, payment_status')
        .eq('tournament_id', tournamentId);

      const participantCount = registrations?.length || 0;
      const confirmedCount = registrations?.filter(r => r.status === 'confirmed').length || 0;
      const pendingCount = registrations?.filter(r => r.status === 'pending').length || 0;

      const revenue = registrations?.reduce((sum: number, reg: any) => {
        if (reg.payment_status === 'paid' && reg.payment_amount) {
          return sum + reg.payment_amount;
        }
        return sum;
      }, 0) || 0;

      setTournament({
        ...tournamentData,
        participantCount,
        confirmedCount,
        pendingCount,
        revenue,
      });
    } catch (error) {
      console.error('Error fetching tournament:', error);
      router.push('/dashboard/tournaments');
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    if (!session || !tournamentId) return;

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
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!session || !tournament) return;

    try {
      const supabase = createClerkSupabaseClient(session);

      const { error } = await supabase
        .from('tournaments')
        .update({ status: newStatus })
        .eq('id', tournament.id);

      if (error) throw error;

      setTournament(prev => prev ? { ...prev, status: newStatus as any } : null);
    } catch (error) {
      console.error('Error updating tournament status:', error);
    }
  };

  const handleDeleteTournament = () => {
    setDeleteConfirmation("");
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTournament = async () => {
    if (!tournamentToDelete || !session) return;

    if (deleteConfirmation !== tournamentToDelete.title) {
      return;
    }

    setDeleting(true);
    try {
      const supabase = createClerkSupabaseClient(session);

      // Delete the tournament (this will cascade delete registrations and athletes due to foreign keys)
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentToDelete.id)
        .eq('organizer_id', user?.id); // Extra safety check

      if (error) throw error;

      // Close dialog and redirect immediately
      setDeleteDialogOpen(false);
      router.push('/dashboard/tournaments');
    } catch (error) {
      console.error('Error deleting tournament:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Helper function to get tournament for deletion
  const tournamentToDelete = tournament;

  const handleParticipantStatusChange = async (participantId: string, newStatus: string) => {
    if (!session) return;

    try {
      const supabase = createClerkSupabaseClient(session);

      const { error } = await supabase
        .from('registrations')
        .update({ status: newStatus })
        .eq('id', participantId);

      if (error) throw error;

      await fetchParticipants();
      await fetchTournament();
    } catch (error) {
      console.error('Error updating participant status:', error);
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

  const getParticipantStatusIcon = (status: string) => {
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

  const copyTournamentLink = async () => {
    const url = `${window.location.origin}/tournaments/${tournamentId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
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
                <p className="mt-2 text-muted-foreground">Loading tournament...</p>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!tournament) {
    return (
      <SidebarProvider defaultOpen={false}>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Tournament not found</h3>
                <p className="text-muted-foreground mb-4">
                  The tournament you're looking for doesn't exist or you don't have access to it.
                </p>
                <Button onClick={() => router.push('/dashboard/tournaments')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Tournaments
                </Button>
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
              <Trophy className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <h1 className="text-xl font-semibold truncate">{tournament.title}</h1>
              <Badge variant={getStatusBadgeVariant(tournament.status)}>
                {formatStatus(tournament.status)}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push(`/dashboard/tournaments/${tournament.id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Tournament
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {tournament.status === 'draft' ? (
                  <DropdownMenuItem onClick={() => handleStatusChange('published')}>
                    <Eye className="mr-2 h-4 w-4" />
                    Publish Tournament
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handleStatusChange('draft')}>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Unpublish Tournament
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteTournament()}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Tournament
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <div className="flex-1 space-y-6 p-6">
            {/* Tournament Overview */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tournament.participantCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Registered athletes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tournament.confirmedCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Active participants
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tournament.pendingCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting confirmation
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${tournament.revenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    From paid registrations
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tournament Details */}
            <Card>
              <CardHeader>
                <CardTitle>Tournament Details</CardTitle>
                <CardDescription>
                  Complete information about this tournament
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Dates:</span>
                      <span>
                        {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Location:</span>
                      <span>{tournament.location}</span>
                    </div>
                    {tournament.max_participants && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Max Participants:</span>
                        <span>{tournament.max_participants}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {tournament.registration_fee && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Registration Fee:</span>
                        <span>${tournament.registration_fee} {tournament.currency}</span>
                      </div>
                    )}
                    {tournament.registration_deadline && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Registration Deadline:</span>
                        <span>{new Date(tournament.registration_deadline).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {tournament.description && (
                  <div className="space-y-2">
                    <span className="font-medium text-sm">Description:</span>
                    <p className="text-sm text-muted-foreground">{tournament.description}</p>
                  </div>
                )}

                {tournament.rules && (
                  <div className="space-y-2">
                    <span className="font-medium text-sm">Rules:</span>
                    <p className="text-sm text-muted-foreground">{tournament.rules}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Manage tournament participants and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => router.push(`/dashboard/tournaments/${tournamentId}/participants`)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Manage Participants ({participants.length})
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => router.push(`/dashboard/tournaments/${tournamentId}/edit`)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Tournament
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => router.push(`/tournaments/${tournamentId}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Public Page
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={copyTournamentLink}
                >
                  {copiedLink ? (
                    <Check className="mr-2 h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copiedLink ? 'Link Copied!' : 'Copy Share Link'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete Tournament
            </AlertDialogTitle>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>
                Are you sure you want to delete <strong>"{tournament.title}"</strong>?
                This action cannot be undone.
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm text-red-800 font-medium mb-2">This will permanently delete:</div>
                <ul className="text-sm text-red-700 space-y-1 ml-4">
                  <li>• The tournament and all its details</li>
                  <li>• All participant registrations ({tournament.participantCount} participants)</li>
                  <li>• All associated athlete data</li>
                  <li>• Payment and registration records</li>
                </ul>
              </div>
              <div className="space-y-2">
                <label htmlFor="delete-confirmation" className="text-sm font-medium">
                  Type <strong>"{tournament.title}"</strong> to confirm:
                </label>
                <Input
                  id="delete-confirmation"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder={`Type "${tournament.title}" here`}
                  className="w-full"
                />
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTournament}
              disabled={!tournament || deleteConfirmation !== tournament.title || deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? "Deleting..." : "Delete Tournament"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}

// Participant Card Component
function ParticipantCard({
  participant,
  onStatusChange
}: {
  participant: RegistrationWithAthlete;
  onStatusChange: (id: string, status: string) => void;
}) {
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
    <div className={`p-4 border rounded-lg ${getStatusColor(participant.status)}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {participant.status === 'confirmed' ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : participant.status === 'pending' ? (
            <Clock className="h-5 w-5 text-yellow-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
          <div>
            <h4 className="font-medium">
              {participant.athlete.first_name} {participant.athlete.last_name}
            </h4>
            <p className="text-sm opacity-75">
              {participant.athlete.belt_rank} • Age: {participant.athlete.date_of_birth ?
                new Date().getFullYear() - new Date(participant.athlete.date_of_birth).getFullYear() :
                'N/A'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={participant.status === 'confirmed' ? 'default' : 'secondary'}>
            {participant.status}
          </Badge>
          {participant.payment_amount && (
            <span className="text-sm font-medium">
              ${participant.payment_amount}
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {participant.status !== 'confirmed' && (
                <DropdownMenuItem onClick={() => onStatusChange(participant.id, 'confirmed')}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Confirm Registration
                </DropdownMenuItem>
              )}
              {participant.status !== 'cancelled' && (
                <DropdownMenuItem onClick={() => onStatusChange(participant.id, 'cancelled')}>
                  <UserX className="mr-2 h-4 w-4" />
                  Cancel Registration
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-2 text-sm opacity-75">
        Registered: {new Date(participant.registration_date).toLocaleDateString()}
        {participant.notes && (
          <span className="ml-4">• {participant.notes}</span>
        )}
      </div>
    </div>
  );
}
