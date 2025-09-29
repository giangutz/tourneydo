"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tournament, Profile } from "@/lib/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Trophy, 
  Plus, 
  Eye, 
  Calendar, 
  MapPin, 
  DollarSign,
  Search,
  Filter,
  Edit,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  MoreHorizontal,
  Settings,
  Copy,
  Archive
} from "lucide-react";
import Link from "next/link";

interface TournamentsListProps {
  userProfile: Profile;
}

export function TournamentsList({ userProfile }: TournamentsListProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const supabase = createClient();

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    filterTournaments();
  }, [tournaments, searchTerm, statusFilter]);

  const fetchTournaments = async () => {
    try {
      let query = supabase
        .from("tournaments")
        .select(`
          *,
          organizer:profiles(*)
        `)
        .order("tournament_date", { ascending: true });

      // Filter based on user role
      if (userProfile.role === "organizer") {
        query = query.eq("organizer_id", userProfile.id);
      } else {
        // For coaches and athletes, show only published tournaments
        query = query.neq("status", "draft");
      }

      const { data, error } = await query;

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterTournaments = () => {
    let filtered = tournaments;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(tournament =>
        tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tournament.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(tournament => tournament.status === statusFilter);
    }

    setFilteredTournaments(filtered);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      registration_open: "default",
      registration_closed: "secondary",
      weigh_in: "default",
      in_progress: "default",
      completed: "secondary",
    };

    const colors: Record<string, string> = {
      draft: "text-gray-600",
      registration_open: "text-green-600",
      registration_closed: "text-yellow-600",
      weigh_in: "text-blue-600",
      in_progress: "text-purple-600",
      completed: "text-gray-600",
    };

    return (
      <Badge variant={variants[status] || "outline"} className={colors[status]}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const isRegistrationOpen = (tournament: Tournament) => {
    const now = new Date();
    const deadline = new Date(tournament.registration_deadline);
    return tournament.status === "registration_open" && now < deadline;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading tournaments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:gap-4 sm:justify-between">
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:flex-1 sm:gap-4">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tournaments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm w-full sm:w-auto"
          >
            <option value="all">All Status</option>
            <option value="registration_open">Registration Open</option>
            <option value="registration_closed">Registration Closed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Enhanced Tournaments Display */}
      {filteredTournaments.length === 0 ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-6 opacity-50" />
            <h3 className="text-2xl font-semibold mb-3">
              {tournaments.length === 0 ? "No tournaments yet" : "No tournaments match your filters"}
            </h3>
            <p className="text-muted-foreground mb-6 text-lg">
              {userProfile.role === "organizer" 
                ? "Create your first tournament to start managing competitions"
                : "Check back later for new tournament opportunities"}
            </p>
            {userProfile.role === "organizer" && tournaments.length === 0 && (
              <Link href="/dashboard/tournaments/create">
                <Button size="lg" className="shadow-lg">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Your First Tournament
                </Button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tournament Count */}
          <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Showing {filteredTournaments.length} of {tournaments.length} tournaments
            </p>
            {userProfile.role === "organizer" && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Active</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Draft</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span>Completed</span>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Tournament Cards */}
          <div className="grid gap-4">
            {filteredTournaments.map((tournament) => {
              const isActive = tournament.status === "registration_open" || tournament.status === "in_progress";
              const isDraft = tournament.status === "draft";
              const isCompleted = tournament.status === "completed";
              
              return (
                <Card 
                  key={tournament.id} 
                  className={`hover:shadow-md transition-all duration-200 border-l-4 ${
                    isActive ? 'border-l-green-500 bg-green-50/30 dark:bg-green-950/10' :
                    isDraft ? 'border-l-yellow-500 bg-yellow-50/30 dark:bg-yellow-950/10' :
                    isCompleted ? 'border-l-gray-400 bg-gray-50/30 dark:bg-gray-950/10' :
                    'border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/10'
                  }`}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                      {/* Main Tournament Info */}
                      <div className="flex-1 space-y-3 min-w-0">
                        <div className="flex flex-col space-y-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                          <div className="space-y-1 min-w-0 flex-1">
                            <h3 className="text-lg sm:text-xl font-semibold leading-tight truncate">{tournament.name}</h3>
                            <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-muted-foreground">
                              <span className="flex items-center min-w-0">
                                <MapPin className="mr-1 h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{tournament.location}</span>
                              </span>
                              <span className="flex items-center">
                                <Calendar className="mr-1 h-3 w-3 flex-shrink-0" />
                                {new Date(tournament.tournament_date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </span>
                              {tournament.entry_fee > 0 && (
                                <span className="flex items-center font-medium">
                                  <div className="mr-1 h-3 w-3 font-bold text-xs flex items-center justify-center">₱</div>
                                  {tournament.entry_fee}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            {getStatusBadge(tournament.status)}
                          </div>
                        </div>

                        {/* Key Metrics for Organizers */}
                        {userProfile.role === "organizer" && (
                          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-6 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2 sm:p-3">
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3 flex-shrink-0" />
                              <span>0 registered</span>
                            </div>
                            <div className="flex items-center space-x-1 min-w-0">
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                {new Date(tournament.registration_deadline) > new Date() 
                                  ? `${Math.ceil((new Date(tournament.registration_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left`
                                  : 'Registration closed'
                                }
                              </span>
                            </div>
                            {tournament.status === "draft" && (
                              <div className="flex items-center space-x-1 text-yellow-600">
                                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                <span>Not published</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2 justify-end sm:ml-6">
                        {userProfile.role === "organizer" ? (
                          <>
                            <Link href={`/dashboard/tournaments/${tournament.id}/edit`}>
                              <Button variant="outline" size="sm" className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:ml-2 sm:inline">Edit</span>
                              </Button>
                            </Link>
                            <Link href={`/dashboard/tournaments/${tournament.id}`}>
                              <Button size="sm" className="h-8 sm:h-9">
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:ml-2 sm:inline">Manage</span>
                              </Button>
                            </Link>
                          </>
                        ) : (
                          <>
                            <Link href={`/dashboard/tournaments/${tournament.id}`}>
                              <Button variant="outline" size="sm" className="h-8 sm:h-9">
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:ml-2 sm:inline">View</span>
                              </Button>
                            </Link>
                            {userProfile.role === "coach" && isRegistrationOpen(tournament) && (
                              <Link href={`/dashboard/tournaments/${tournament.id}/register`}>
                                <Button size="sm" className="h-8 sm:h-9">
                                  <span className="text-xs sm:text-sm">Register</span>
                                </Button>
                              </Link>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
