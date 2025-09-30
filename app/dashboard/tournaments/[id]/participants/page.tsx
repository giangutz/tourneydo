"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Trophy,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Users,
  Calendar,
  MapPin,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Save,
  UserCheck,
  UserX,
  Eye,
  EyeOff,
  Plus,
  Download,
  Upload
} from "lucide-react";
import { createClerkSupabaseClient } from "@/lib/supabase";
import { useUser, useSession } from "@clerk/nextjs";
import type { Registration, Athlete, Tournament } from "@/types/database";

interface RegistrationWithAthlete extends Registration {
  athlete: Athlete;
}

export default function TournamentParticipantsPage() {
  const router = useRouter();
  const params = useParams();
  const tournamentId = params.id as string;

  const { user } = useUser();
  const { session } = useSession();

  // State management
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<RegistrationWithAthlete[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<RegistrationWithAthlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<RegistrationWithAthlete | null>(null);
  const [editForm, setEditForm] = useState({
    status: "",
    payment_status: "",
    notes: "",
  });

  // Load data on mount
  useEffect(() => {
    if (user?.id && tournamentId) {
      fetchTournament();
      fetchParticipants();
    }
  }, [user?.id, tournamentId]);

  // Filter participants based on search and status
  useEffect(() => {
    let filtered = participants;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(participant =>
        participant.athlete.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        participant.athlete.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        participant.athlete.belt_rank.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(participant => participant.status === statusFilter);
    }

    setFilteredParticipants(filtered);
  }, [participants, searchTerm, statusFilter]);

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

      setTournament(tournamentData);
    } catch (error) {
      console.error('Error fetching tournament:', error);
      router.push('/dashboard/tournaments');
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
    } finally {
      setLoading(false);
    }
  };

  const handleEditParticipant = (participant: RegistrationWithAthlete) => {
    setSelectedParticipant(participant);
    setEditForm({
      status: participant.status,
      payment_status: participant.payment_status || "pending",
      notes: participant.notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveParticipant = async () => {
    if (!selectedParticipant || !session) return;

    try {
      const supabase = createClerkSupabaseClient(session);

      const { error } = await supabase
        .from('registrations')
        .update({
          status: editForm.status,
          payment_status: editForm.payment_status,
          notes: editForm.notes,
        })
        .eq('id', selectedParticipant.id);

      if (error) throw error;

      await fetchParticipants();
      setEditDialogOpen(false);
      setSelectedParticipant(null);
    } catch (error) {
      console.error('Error updating participant:', error);
    }
  };

  const handleStatusChange = async (participantId: string, newStatus: string) => {
    if (!session) return;

    try {
      const supabase = createClerkSupabaseClient(session);

      const { error } = await supabase
        .from('registrations')
        .update({ status: newStatus })
        .eq('id', participantId);

      if (error) throw error;

      await fetchParticipants();
    } catch (error) {
      console.error('Error updating participant status:', error);
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (!session || filteredParticipants.length === 0) return;

    try {
      const supabase = createClerkSupabaseClient(session);

      const { error } = await supabase
        .from('registrations')
        .update({ status: newStatus })
        .in('id', filteredParticipants.map(p => p.id));

      if (error) throw error;

      await fetchParticipants();
    } catch (error) {
      console.error('Error updating participants:', error);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const exportParticipants = () => {
    // Simple CSV export
    const headers = ['Name', 'Emergency Contact', 'Contact Phone', 'Belt Rank', 'Age', 'Status', 'Payment Status', 'Registration Date', 'Amount'];
    const csvData = filteredParticipants.map(p => [
      `${p.athlete.first_name} ${p.athlete.last_name}`,
      p.athlete.emergency_contact_name || '',
      p.athlete.emergency_contact_phone || '',
      p.athlete.belt_rank,
      p.athlete.date_of_birth ? (new Date().getFullYear() - new Date(p.athlete.date_of_birth).getFullYear()).toString() : '',
      p.status,
      p.payment_status || 'pending',
      new Date(p.registration_date).toLocaleDateString(),
      p.payment_amount?.toString() || ''
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tournament?.title || 'tournament'}-participants.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
                <p className="mt-2 text-muted-foreground">Loading participants...</p>
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
              <Users className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <h1 className="text-xl font-semibold truncate">{tournament.title} - Participants</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportParticipants}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleBulkStatusChange('confirmed')}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Confirm All Filtered
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusChange('cancelled')}>
                    <UserX className="mr-2 h-4 w-4" />
                    Cancel All Filtered
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className="flex-1 space-y-6 p-6">
            {/* Tournament Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">{tournament.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {tournament.location}
                      </span>
                    </div>
                  </div>
                  <Badge variant={getStatusBadgeVariant(tournament.status)}>
                    {formatStatus(tournament.status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{participants.length}</div>
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
                  <div className="text-2xl font-bold">
                    {participants.filter(p => p.status === 'confirmed').length}
                  </div>
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
                  <div className="text-2xl font-bold">
                    {participants.filter(p => p.status === 'pending').length}
                  </div>
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
                  <div className="text-2xl font-bold">
                    ${participants.reduce((sum, p) => sum + (p.payment_amount || 0), 0).toFixed(2)}
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
                      placeholder="Search participants..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Participants Table */}
            <Card>
              <CardHeader>
                <CardTitle>Participants ({filteredParticipants.length})</CardTitle>
                <CardDescription>
                  Comprehensive participant management and details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Participant</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Belt Rank</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredParticipants.length > 0 ? (
                        filteredParticipants.map((participant) => (
                          <TableRow key={participant.id}>
                            <TableCell>
                              <div className="font-medium">
                                {participant.athlete.first_name} {participant.athlete.last_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {participant.athlete.emergency_contact_name || 'N/A'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {participant.athlete.emergency_contact_phone || 'No contact'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {participant.athlete.belt_rank}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {participant.athlete.date_of_birth ?
                                new Date().getFullYear() - new Date(participant.athlete.date_of_birth).getFullYear() :
                                'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(participant.status)}>
                                {formatStatus(participant.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getPaymentStatusIcon(participant.payment_status || 'pending')}
                                <span className="text-sm">
                                  {participant.payment_amount ? `$${participant.payment_amount}` : 'N/A'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(participant.registration_date).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(participant.registration_date).toLocaleTimeString()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleEditParticipant(participant)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {participant.status !== 'confirmed' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(participant.id, 'confirmed')}>
                                      <UserCheck className="mr-2 h-4 w-4" />
                                      Confirm Registration
                                    </DropdownMenuItem>
                                  )}
                                  {participant.status !== 'cancelled' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(participant.id, 'cancelled')}>
                                      <UserX className="mr-2 h-4 w-4" />
                                      Cancel Registration
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            {searchTerm || statusFilter !== "all"
                              ? 'No participants found matching your filters'
                              : 'No participants registered yet'
                            }
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Edit Participant Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Participant</DialogTitle>
            <DialogDescription>
              Update participant registration details and status
            </DialogDescription>
          </DialogHeader>

          {selectedParticipant && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Participant</Label>
                  <div className="p-2 bg-muted rounded text-sm">
                    {selectedParticipant.athlete.first_name} {selectedParticipant.athlete.last_name}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Belt Rank</Label>
                  <div className="p-2 bg-muted rounded text-sm">
                    {selectedParticipant.athlete.belt_rank}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Registration Status</Label>
                  <Select value={editForm.status} onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_status">Payment Status</Label>
                  <Select value={editForm.payment_status} onValueChange={(value) => setEditForm(prev => ({ ...prev, payment_status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes or comments..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveParticipant}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
