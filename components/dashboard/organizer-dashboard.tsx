/* eslint-disable  @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile, Tournament } from "@/lib/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Users,
  Calendar,
  Plus,
  Eye,
  Edit,
  TrendingUp,
  Clock,
  AlertCircle,
  Activity,
  BarChart3,
  FileText,
  Settings,
  Star,
  MapPin,
  UserCheck,
  Zap
} from "lucide-react";
import Link from "next/link";

interface OrganizerDashboardProps {
  profile: Profile;
}

export function OrganizerDashboard({ profile }: OrganizerDashboardProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [stats, setStats] = useState({
    totalTournaments: 0,
    activeTournaments: 0,
    totalParticipants: 0,
    totalRevenue: 0,
    draftTournaments: 0,
    completedTournaments: 0,
    pendingPayments: 0,
    avgParticipantsPerTournament: 0,
    recentRegistrations: 0,
    upcomingTournaments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<unknown[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<unknown[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch tournaments with more details
      const { data: tournamentsData } = await supabase
        .from("tournaments")
        .select("*")
        .eq("organizer_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (tournamentsData) {
        setTournaments(tournamentsData);
      }

      // Fetch all tournaments for comprehensive stats
      const { data: allTournaments } = await supabase
        .from("tournaments")
        .select("id, status, entry_fee, tournament_date, registration_deadline, created_at")
        .eq("organizer_id", profile.id);

      // Fetch all registrations with more details
      const { data: registrations } = await supabase
        .from("tournament_registrations")
        .select(`
          tournament_id, 
          payment_amount, 
          payment_status,
          registration_date,
          checked_in,
          weighed_in
        `)
        .in("tournament_id", allTournaments?.map(t => t.id) || []);

      // Fetch recent activity (recent registrations)
      const { data: recentRegs } = await supabase
        .from("tournament_registrations")
        .select(`
          *,
          athlete:athletes(full_name),
          tournament:tournaments(name)
        `)
        .in("tournament_id", allTournaments?.map(t => t.id) || [])
        .order("registration_date", { ascending: false })
        .limit(5);

      if (recentRegs) {
        setRecentActivity(recentRegs);
      }

      if (allTournaments) {
        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        // Calculate comprehensive stats
        const activeTournaments = allTournaments.filter(
          t => t.status === "registration_open" || t.status === "in_progress"
        ).length;

        const draftTournaments = allTournaments.filter(t => t.status === "draft").length;
        const completedTournaments = allTournaments.filter(t => t.status === "completed").length;
        
        const upcomingTournaments = allTournaments.filter(
          t => new Date(t.tournament_date) > now && t.status !== "completed"
        ).length;

        const totalRevenue = registrations?.reduce(
          (sum, reg) => sum + (reg.payment_amount || 0), 0
        ) || 0;

        const pendingPayments = registrations?.filter(
          r => r.payment_status === "pending"
        ).length || 0;

        const recentRegistrations = registrations?.filter(
          r => new Date(r.registration_date) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        ).length || 0;

        const avgParticipants = allTournaments.length > 0 
          ? Math.round((registrations?.length || 0) / allTournaments.length)
          : 0;

        // Get upcoming deadlines
        const deadlines = allTournaments
          .filter(t => {
            const regDeadline = new Date(t.registration_deadline);
            return regDeadline > now && regDeadline <= oneWeekFromNow;
          })
          .map(t => ({
            ...t,
            daysUntilDeadline: Math.ceil(
              (new Date(t.registration_deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )
          }))
          .sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline);

        setUpcomingDeadlines(deadlines);

        setStats({
          totalTournaments: allTournaments.length,
          activeTournaments,
          totalParticipants: registrations?.length || 0,
          totalRevenue,
          draftTournaments,
          completedTournaments,
          pendingPayments,
          avgParticipantsPerTournament: avgParticipants,
          recentRegistrations,
          upcomingTournaments,
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, profile.id]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      registration_open: "default",
      registration_closed: "secondary",
      in_progress: "default",
      completed: "secondary",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Welcome Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight">
            Welcome back, {profile.full_name}!
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-2">
            Here&apos;s what&apos;s happening with your tournaments today
          </p>
        </div>
      </div>

      {/* Alerts & Notifications */}
      {upcomingDeadlines.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5 dark:bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertCircle className="mr-2 h-5 w-5" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingDeadlines.slice(0, 3).map((tournament: unknown) => {
                const tournamentData = tournament as { id: string; name: string; registration_deadline: string; daysUntilDeadline: number };
                return (
                <div key={tournamentData.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{tournamentData.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Registration closes in {tournamentData.daysUntilDeadline} day{tournamentData.daysUntilDeadline !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Link href={`/dashboard/tournaments/${tournamentData.id}`}>
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                  </Link>
                </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Stats Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Primary Stats */}
        <Card className="border-l-4 border-l-chart-5 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tournaments</CardTitle>
            <Trophy className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalTournaments}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              {stats.draftTournaments} drafts, {stats.completedTournaments} completed
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-5 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tournaments</CardTitle>
            <Activity className="h-5 w-5 text-chart-1" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeTournaments}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Calendar className="h-3 w-3 mr-1" />
              {stats.upcomingTournaments} upcoming
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-5 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <Users className="h-5 w-5 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalParticipants}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <BarChart3 className="h-3 w-3 mr-1" />
              Avg {stats.avgParticipantsPerTournament} per tournament
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-5 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="h-5 w-5 text-chart-3 font-bold text-lg flex items-center justify-center">₱</div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₱{stats.totalRevenue.toFixed(2)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <AlertCircle className="h-3 w-3 mr-1" />
              {stats.pendingPayments} pending payments
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-chart-5 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Zap className="h-4 w-4 text-accent-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentRegistrations}</div>
            <p className="text-xs text-muted-foreground">New registrations this week</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-5 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Tournaments</CardTitle>
            <FileText className="h-4 w-4 text-secondary-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draftTournaments}</div>
            <p className="text-xs text-muted-foreground">Ready to publish</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-5 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Star className="h-4 w-4 text-chart-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalTournaments > 0 ? Math.round((stats.completedTournaments / stats.totalTournaments) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Tournaments completed</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Enhanced Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common tournament management tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:gap-3">
            <Link href="/dashboard/tournaments/create">
              <Button className="w-full justify-start h-10 sm:h-12" size="lg">
                <Plus className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5" />
                <div className="text-left">
                  <div className="font-medium text-sm sm:text-base">Create New Tournament</div>
                  <div className="text-xs opacity-70 hidden sm:block">Set up a new competition</div>
                </div>
              </Button>
            </Link>
            <Link href="/dashboard/tournaments">
              <Button variant="outline" className="w-full justify-start h-10 sm:h-12" size="lg">
                <Trophy className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5" />
                <div className="text-left">
                  <div className="font-medium text-sm sm:text-base">Manage Tournaments</div>
                  <div className="text-xs opacity-70 hidden sm:block">View and edit all tournaments</div>
                </div>
              </Button>
            </Link>
            <Link href="/dashboard/athletes">
              <Button variant="outline" className="w-full justify-start h-10 sm:h-12" size="lg">
                <UserCheck className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5" />
                <div className="text-left">
                  <div className="font-medium text-sm sm:text-base">View Athletes</div>
                  <div className="text-xs opacity-70 hidden sm:block">Manage registered athletes</div>
                </div>
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest registrations and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {recentActivity.slice(0, 5).map((activity: unknown, index: number) => {
                  const activityData = activity as { athlete?: { full_name: string }; tournament?: { name: string }; created_at: string };
                  return (
                  <div key={index} className="flex items-center space-x-2 sm:space-x-3 p-2 rounded-lg bg-muted/50">
                    <div className="h-2 w-2 bg-green-500 rounded-full flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">
                        {activityData.athlete?.full_name || 'Unknown Athlete'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        Registered for {activityData.tournament?.name || 'Unknown Tournament'}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">
                      {new Date(activityData.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Recent Tournaments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Trophy className="mr-2 h-5 w-5" />
                Recent Tournaments
              </CardTitle>
              <CardDescription>
                Your latest tournament activities
              </CardDescription>
            </div>
            <Link href="/dashboard/tournaments">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {tournaments.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4">
              <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">No tournaments yet</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto">
                Create your first tournament to start managing competitions and tracking participants
              </p>
              <Link href="/dashboard/tournaments/create">
                <Button size="lg" className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden xs:inline">Create Your First Tournament</span>
                  <span className="xs:hidden">Create Tournament</span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {tournaments.map((tournament) => (
                <Card key={tournament.id} className="border-l-4 border-l-primary/50">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                          <h4 className="font-semibold text-base sm:text-lg truncate">{tournament.name}</h4>
                          <div className="flex-shrink-0">
                            {getStatusBadge(tournament.status)}
                          </div>
                        </div>
                        <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <MapPin className="mr-1 h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{tournament.location}</span>
                          </span>
                          <span className="flex items-center">
                            <Calendar className="mr-1 h-3 w-3 flex-shrink-0" />
                            {new Date(tournament.tournament_date).toLocaleDateString()}
                          </span>
                          {tournament.entry_fee > 0 && (
                            <span className="flex items-center">
                              <div className="mr-1 h-3 w-3 font-bold text-xs flex items-center justify-center">₱</div>
                              {tournament.entry_fee}
                            </span>
                          )}
                        </div>
                        {tournament.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                            {tournament.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 sm:ml-4 justify-end">
                        <Link href={`/dashboard/tournaments/${tournament.id}/edit`}>
                          <Button variant="outline" size="sm" className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:ml-2 sm:inline">Edit</span>
                          </Button>
                        </Link>
                        <Link href={`/dashboard/tournaments/${tournament.id}`}>
                          <Button size="sm" className="h-8 sm:h-9">
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:ml-2 sm:inline">View</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
