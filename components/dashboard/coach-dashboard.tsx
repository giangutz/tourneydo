"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile, Athlete, Team, Tournament } from "@/lib/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Eye, UserPlus, Calendar } from "lucide-react";
import Link from "next/link";

interface CoachDashboardProps {
  profile: Profile;
}

export function CoachDashboard({ profile }: CoachDashboardProps) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [availableTournaments, setAvailableTournaments] = useState<Tournament[]>([]);
  const [stats, setStats] = useState({
    totalAthletes: 0,
    registeredAthletes: 0,
    upcomingTournaments: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch team
      const { data: teamData } = await supabase
        .from("teams")
        .select("*")
        .eq("coach_id", profile.id)
        .single();

      if (teamData) {
        setTeam(teamData);

        // Fetch athletes
        const { data: athletesData } = await supabase
          .from("athletes")
          .select("*")
          .eq("team_id", teamData.id)
          .order("created_at", { ascending: false });

        if (athletesData) {
          setAthletes(athletesData);
        }

        // Fetch registrations count
        const { data: registrations } = await supabase
          .from("tournament_registrations")
          .select("athlete_id")
          .eq("team_id", teamData.id);

        setStats(prev => ({
          ...prev,
          totalAthletes: athletesData?.length || 0,
          registeredAthletes: registrations?.length || 0,
        }));
      }

      // Fetch available tournaments
      const { data: tournamentsData } = await supabase
        .from("tournaments")
        .select("*")
        .eq("status", "registration_open")
        .order("tournament_date", { ascending: true })
        .limit(5);

      if (tournamentsData) {
        setAvailableTournaments(tournamentsData);
        setStats(prev => ({
          ...prev,
          upcomingTournaments: tournamentsData.length,
        }));
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
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold">Coach Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your team and register athletes for tournaments
        </p>
        {team && (
          <p className="text-sm text-muted-foreground mt-1">
            Team: {team.name}
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Athletes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAthletes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registered Athletes</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.registeredAthletes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tournaments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingTournaments}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for managing your team
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Link href="/dashboard/athletes/create">
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Athlete
            </Button>
          </Link>
          <Link href="/dashboard/tournaments">
            <Button variant="outline">
              <Trophy className="mr-2 h-4 w-4" />
              Browse Tournaments
            </Button>
          </Link>
          <Link href="/dashboard/registrations">
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              View Registrations
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Athletes List */}
      <Card>
        <CardHeader>
          <CardTitle>My Athletes</CardTitle>
          <CardDescription>
            Manage your team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {athletes.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No athletes yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first athlete to get started
              </p>
              <Link href="/dashboard/athletes/create">
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Athlete
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {athletes.slice(0, 5).map((athlete) => (
                <div
                  key={athlete.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <h4 className="font-semibold">{athlete.full_name}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge className={getBeltColor(athlete.belt_rank)}>
                        {athlete.belt_rank.replace("_", " ").toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {athlete.gender} • {athlete.weight_class ? `${athlete.weight_class}kg` : 'No weight'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link href={`/dashboard/athletes/${athlete.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
              {athletes.length > 5 && (
                <div className="text-center pt-4">
                  <Link href="/dashboard/athletes">
                    <Button variant="outline">
                      View All Athletes ({athletes.length})
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Tournaments */}
      <Card>
        <CardHeader>
          <CardTitle>Open for Registration</CardTitle>
          <CardDescription>
            Tournaments currently accepting registrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableTournaments.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No open tournaments</h3>
              <p className="text-muted-foreground">
                Check back later for new tournament opportunities
              </p>
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
