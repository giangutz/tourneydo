"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile, Athlete, Tournament, TournamentRegistration } from "@/lib/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, Medal, User, Eye, Edit } from "lucide-react";
import Link from "next/link";

interface AthleteDashboardProps {
  profile: Profile;
}

export function AthleteDashboard({ profile }: AthleteDashboardProps) {
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [availableTournaments, setAvailableTournaments] = useState<Tournament[]>([]);
  const [stats, setStats] = useState({
    totalTournaments: 0,
    upcomingTournaments: 0,
    completedTournaments: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch athlete profile
      const { data: athleteData } = await supabase
        .from("athletes")
        .select("*")
        .eq("profile_id", profile.id)
        .single();

      if (athleteData) {
        setAthlete(athleteData);

        // Fetch registrations with tournament details
        const { data: registrationsData } = await supabase
          .from("tournament_registrations")
          .select(`
            *,
            tournament:tournaments(*)
          `)
          .eq("athlete_id", athleteData.id)
          .order("registration_date", { ascending: false });

        if (registrationsData) {
          setRegistrations(registrationsData);

          const completed = registrationsData.filter(
            r => r.tournament?.status === "completed"
          ).length;

          const upcoming = registrationsData.filter(
            r => r.tournament?.status === "registration_open" || 
                 r.tournament?.status === "in_progress"
          ).length;

          setStats({
            totalTournaments: registrationsData.length,
            upcomingTournaments: upcoming,
            completedTournaments: completed,
          });
        }
      }

      // Fetch available tournaments (not registered for)
      const { data: allTournaments } = await supabase
        .from("tournaments")
        .select("*")
        .eq("status", "registration_open")
        .order("tournament_date", { ascending: true });

      if (allTournaments && athlete) {
        const registeredTournamentIds = registrations.map(r => r.tournament_id);
        const available = allTournaments.filter(
          t => !registeredTournamentIds.includes(t.id)
        );
        setAvailableTournaments(available.slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getBeltColor = (beltRank: string) => {
    const colors: Record<string, string> = {
      white: "bg-gray-100 text-gray-800",
      yellow: "bg-yellow-100 text-yellow-800",
      orange: "bg-orange-100 text-orange-800",
      green: "bg-green-100 text-green-800",
      blue: "bg-blue-100 text-blue-800",
      brown: "bg-amber-100 text-amber-800",
      black_1: "bg-black text-white",
      black_2: "bg-black text-white",
      black_3: "bg-black text-white",
    };
    return colors[beltRank] || "bg-gray-100 text-gray-800";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
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

  if (!athlete) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Complete Your Profile</h3>
          <p className="text-muted-foreground mb-4">
            Create your athlete profile to start participating in tournaments
          </p>
          <Link href="/dashboard/profile/create">
            <Button>
              <User className="mr-2 h-4 w-4" />
              Create Profile
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold">Athlete Dashboard</h1>
        <p className="text-muted-foreground">
          Track your tournament participation and results
        </p>
      </div>

      {/* Athlete Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>Your athlete information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{athlete.full_name}</h3>
              <div className="flex items-center space-x-4">
                <Badge className={getBeltColor(athlete.belt_rank)}>
                  {athlete.belt_rank.replace("_", " ").toUpperCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {athlete.gender} • Age: {new Date().getFullYear() - new Date(athlete.date_of_birth).getFullYear()}
                </span>
                {athlete.weight_class && (
                  <span className="text-sm text-muted-foreground">
                    Weight: {athlete.weight_class}kg
                  </span>
                )}
              </div>
            </div>
            <Link href="/dashboard/profile">
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tournaments</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTournaments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingTournaments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Medal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTournaments}</div>
          </CardContent>
        </Card>
      </div>

      {/* My Tournaments */}
      <Card>
        <CardHeader>
          <CardTitle>My Tournaments</CardTitle>
          <CardDescription>
            Your tournament registrations and results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {registrations.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tournaments yet</h3>
              <p className="text-muted-foreground mb-4">
                Register for your first tournament to get started
              </p>
              <Link href="/dashboard/tournaments">
                <Button>
                  <Trophy className="mr-2 h-4 w-4" />
                  Browse Tournaments
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {registrations.slice(0, 5).map((registration) => (
                <div
                  key={registration.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <h4 className="font-semibold">{registration.tournament?.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {registration.tournament?.location} • {
                        registration.tournament?.tournament_date ? 
                        new Date(registration.tournament.tournament_date).toLocaleDateString() : 
                        'Date TBD'
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Registered: {new Date(registration.registration_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {registration.tournament?.status && getStatusBadge(registration.tournament.status)}
                    <Link href={`/dashboard/tournaments/${registration.tournament_id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
              {registrations.length > 5 && (
                <div className="text-center pt-4">
                  <Link href="/dashboard/tournaments">
                    <Button variant="outline">
                      View All Tournaments ({registrations.length})
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Tournaments */}
      {availableTournaments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Tournaments</CardTitle>
            <CardDescription>
              Tournaments you can register for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableTournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <h4 className="font-semibold">{tournament.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {tournament.location} • {new Date(tournament.tournament_date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Entry Fee: ${tournament.entry_fee}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default">Open</Badge>
                    <Link href={`/dashboard/tournaments/${tournament.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
