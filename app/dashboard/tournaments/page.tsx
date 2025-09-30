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
  CheckCircle,
  Clock,
  AlertTriangle
} from "lucide-react";
import { createClerkSupabaseClient } from "@/lib/supabase";
import { useUser, useSession } from "@clerk/nextjs";
import type { Tournament } from "@/types/database";

interface TournamentWithStats extends Tournament {
  participantCount: number;
  confirmedCount: number;
  pendingCount: number;
  revenue: number;
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
              <h1 className="text-xl font-semibold truncate">Tournaments</h1>
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

            {/* Tournaments Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTournaments.length > 0 ? (
                filteredTournaments.map((tournament) => (
                  <Card
                    key={tournament.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                    onClick={() => router.push(`/dashboard/tournaments/${tournament.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-lg line-clamp-2">{tournament.title}</CardTitle>
                          <Badge variant={getStatusBadgeVariant(tournament.status)} className="text-xs">
                            {formatStatus(tournament.status)}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/tournaments/${tournament.id}/edit`);
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/tournaments/${tournament.id}/participants`);
                            }}>
                              <Users className="mr-2 h-4 w-4" />
                              Manage Participants
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{tournament.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{tournament.participantCount} participants</span>
                        </div>
                        {tournament.revenue > 0 && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span>${tournament.revenue.toFixed(2)} revenue</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
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
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
