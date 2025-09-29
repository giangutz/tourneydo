"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tournament, TournamentRegistration, Division, TournamentResult } from "@/lib/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  Download, 
  FileText, 
  Trophy, 
  Users, 
  DollarSign,
  Medal,
  Calendar,
  Target
} from "lucide-react";

interface ReportsManagerProps {
  organizerId: string;
}

interface TournamentStats {
  totalParticipants: number;
  totalRevenue: number;
  paidRegistrations: number;
  pendingPayments: number;
  divisionsCount: number;
  completedMatches: number;
  medalDistribution: {
    gold: number;
    silver: number;
    bronze: number;
  };
}

export function ReportsManager({ organizerId }: ReportsManagerProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [tournamentStats, setTournamentStats] = useState<TournamentStats | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchTournamentData();
    }
  }, [selectedTournament]);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("organizer_id", organizerId)
        .order("tournament_date", { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
      
      // Auto-select the first tournament
      if (data && data.length > 0) {
        setSelectedTournament(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTournamentData = async () => {
    if (!selectedTournament) return;

    try {
      // Fetch registrations
      const { data: regData } = await supabase
        .from("tournament_registrations")
        .select(`
          *,
          athlete:athletes(*),
          team:teams(*)
        `)
        .eq("tournament_id", selectedTournament);

      setRegistrations(regData || []);

      // Fetch divisions
      const { data: divData } = await supabase
        .from("divisions")
        .select(`
          *,
          participants:division_participants(*)
        `)
        .eq("tournament_id", selectedTournament);

      setDivisions(divData || []);

      // Fetch results
      const { data: resultData } = await supabase
        .from("tournament_results")
        .select(`
          *,
          athlete:athletes(*),
          division:divisions(*)
        `)
        .eq("tournament_id", selectedTournament);

      setResults(resultData || []);

      // Calculate stats
      if (regData) {
        const paidCount = regData.filter(r => r.payment_status === "paid").length;
        const totalRevenue = regData.reduce((sum, r) => sum + (r.payment_amount || 0), 0);
        
        const goldMedals = resultData?.filter(r => r.medal_type === "gold").length || 0;
        const silverMedals = resultData?.filter(r => r.medal_type === "silver").length || 0;
        const bronzeMedals = resultData?.filter(r => r.medal_type === "bronze").length || 0;

        setTournamentStats({
          totalParticipants: regData.length,
          totalRevenue,
          paidRegistrations: paidCount,
          pendingPayments: regData.length - paidCount,
          divisionsCount: divData?.length || 0,
          completedMatches: 0, // Would need to query matches table
          medalDistribution: {
            gold: goldMedals,
            silver: silverMedals,
            bronze: bronzeMedals,
          },
        });
      }
    } catch (error) {
      console.error("Error fetching tournament data:", error);
    }
  };

  const generateParticipantReport = () => {
    if (!registrations.length) return;

    const csvContent = [
      ["Name", "Team", "Gender", "Belt Rank", "Age", "Weight", "Payment Status", "Registration Date"].join(","),
      ...registrations.map(reg => [
        reg.athlete?.full_name || "",
        reg.team?.name || "",
        reg.athlete?.gender || "",
        reg.athlete?.belt_rank?.replace("_", " ") || "",
        reg.athlete?.date_of_birth ? new Date().getFullYear() - new Date(reg.athlete.date_of_birth).getFullYear() : "",
        reg.athlete?.weight_class || "",
        reg.payment_status,
        new Date(reg.registration_date).toLocaleDateString()
      ].join(","))
    ].join("\n");

    downloadCSV(csvContent, "participants-report.csv");
  };

  const generateDivisionReport = () => {
    if (!divisions.length) return;

    const csvContent = [
      ["Division Name", "Gender", "Age Range", "Weight Range", "Belt Range", "Participants"].join(","),
      ...divisions.map(div => [
        div.name,
        div.gender,
        `${div.min_age}-${div.max_age}`,
        div.min_weight && div.max_weight ? `${div.min_weight}-${div.max_weight}kg` : "All Weights",
        `${div.belt_rank_min} - ${div.belt_rank_max}`,
        div.participants?.length || 0
      ].join(","))
    ].join("\n");

    downloadCSV(csvContent, "divisions-report.csv");
  };

  const generateResultsReport = () => {
    if (!results.length) return;

    const csvContent = [
      ["Athlete Name", "Division", "Placement", "Medal"].join(","),
      ...results.map(result => [
        result.athlete?.full_name || "",
        result.division?.name || "",
        result.placement,
        result.medal_type || ""
      ].join(","))
    ].join("\n");

    downloadCSV(csvContent, "results-report.csv");
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No tournaments found</h3>
        <p className="text-muted-foreground">
          Create tournaments to generate reports and analytics
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tournament Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Tournament</CardTitle>
          <CardDescription>
            Choose a tournament to generate reports for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedTournament} onValueChange={setSelectedTournament}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select a tournament" />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map((tournament) => (
                <SelectItem key={tournament.id} value={tournament.id}>
                  {tournament.name} - {new Date(tournament.tournament_date).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedTournament && tournamentStats && (
        <>
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tournamentStats.totalParticipants}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${tournamentStats.totalRevenue.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Divisions</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tournamentStats.divisionsCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Medals Awarded</CardTitle>
                <Medal className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tournamentStats.medalDistribution.gold + 
                   tournamentStats.medalDistribution.silver + 
                   tournamentStats.medalDistribution.bronze}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reports Tabs */}
          <Tabs defaultValue="participants" className="space-y-4">
            <TabsList>
              <TabsTrigger value="participants">Participants</TabsTrigger>
              <TabsTrigger value="divisions">Divisions</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
            </TabsList>

            <TabsContent value="participants" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Participants Report</CardTitle>
                      <CardDescription>
                        Detailed list of all registered athletes
                      </CardDescription>
                    </div>
                    <Button onClick={generateParticipantReport}>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {registrations.slice(0, 10).map((registration) => (
                      <div
                        key={registration.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <h4 className="font-semibold">{registration.athlete?.full_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {registration.team?.name} • {registration.athlete?.gender} • 
                            {registration.athlete?.belt_rank?.replace("_", " ").toUpperCase()}
                          </p>
                        </div>
                        <Badge variant={registration.payment_status === "paid" ? "default" : "outline"}>
                          {registration.payment_status.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                    {registrations.length > 10 && (
                      <p className="text-sm text-muted-foreground text-center">
                        And {registrations.length - 10} more participants...
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="divisions" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Divisions Report</CardTitle>
                      <CardDescription>
                        Tournament divisions and participant distribution
                      </CardDescription>
                    </div>
                    <Button onClick={generateDivisionReport}>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {divisions.map((division) => (
                      <div
                        key={division.id}
                        className="p-4 border rounded-lg"
                      >
                        <h4 className="font-semibold">{division.name}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground mt-2">
                          <span>Age: {division.min_age}-{division.max_age}</span>
                          <span>Gender: {division.gender}</span>
                          <span>Belt: {division.belt_rank_min} - {division.belt_rank_max}</span>
                          <span>Participants: {division.participants?.length || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Results Report</CardTitle>
                      <CardDescription>
                        Tournament results and medal winners
                      </CardDescription>
                    </div>
                    <Button onClick={generateResultsReport} disabled={results.length === 0}>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {results.length === 0 ? (
                    <div className="text-center py-8">
                      <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No results yet</h3>
                      <p className="text-muted-foreground">
                        Results will appear here once matches are completed
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {results.map((result) => (
                        <div
                          key={result.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="space-y-1">
                            <h4 className="font-semibold">{result.athlete?.full_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {result.division?.name}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">
                              {result.placement === 1 ? "1st" : 
                               result.placement === 2 ? "2nd" : 
                               result.placement === 3 ? "3rd" : 
                               `${result.placement}th`} Place
                            </Badge>
                            {result.medal_type && (
                              <Badge variant={
                                result.medal_type === "gold" ? "default" :
                                result.medal_type === "silver" ? "secondary" :
                                "outline"
                              }>
                                {result.medal_type.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="financial" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span>Paid Registrations:</span>
                      <span className="font-semibold">{tournamentStats.paidRegistrations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending Payments:</span>
                      <span className="font-semibold text-yellow-600">{tournamentStats.pendingPayments}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span>Total Revenue:</span>
                      <span className="font-semibold text-green-600">${tournamentStats.totalRevenue.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Medal Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span>🥇 Gold Medals:</span>
                      <span className="font-semibold">{tournamentStats.medalDistribution.gold}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🥈 Silver Medals:</span>
                      <span className="font-semibold">{tournamentStats.medalDistribution.silver}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🥉 Bronze Medals:</span>
                      <span className="font-semibold">{tournamentStats.medalDistribution.bronze}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
