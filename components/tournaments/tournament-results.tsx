"use client";

import { Tournament, Division } from "@/lib/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, 
  Medal, 
  ArrowLeft,
  Download,
  Calendar,
  MapPin
} from "lucide-react";
import Link from "next/link";

interface TournamentResult {
  id: string;
  tournament_id: string;
  division_id: string;
  athlete_id: string;
  placement: number;
  medal_type?: string;
  athlete?: {
    id: string;
    full_name: string;
    team_id?: string;
  };
  division?: {
    id: string;
    name: string;
    gender: string;
    min_age: number;
    max_age: number;
    belt_rank_min: string;
    belt_rank_max: string;
  };
}

interface TournamentResultsProps {
  tournament: Tournament & {
    organizer?: {
      full_name: string;
      organization?: string;
    };
  };
  results: TournamentResult[];
  divisions: Division[];
}

export function TournamentResults({ tournament, results, divisions }: TournamentResultsProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getMedalIcon = (placement: number) => {
    switch (placement) {
      case 1:
        return <span className="text-yellow-500">🥇</span>;
      case 2:
        return <span className="text-gray-400">🥈</span>;
      case 3:
        return <span className="text-amber-600">🥉</span>;
      default:
        return <span className="text-muted-foreground">{placement}</span>;
    }
  };

  const getPlacementBadge = (placement: number) => {
    const variants = {
      1: "default" as const,
      2: "secondary" as const,
      3: "outline" as const,
    };
    
    const variant = variants[placement as keyof typeof variants] || "outline";
    const suffix = placement === 1 ? "st" : placement === 2 ? "nd" : placement === 3 ? "rd" : "th";
    
    return (
      <Badge variant={variant}>
        {placement}{suffix} Place
      </Badge>
    );
  };

  // Group results by division
  const resultsByDivision = divisions.map(division => ({
    division,
    results: results.filter(r => r.division_id === division.id).sort((a, b) => a.placement - b.placement)
  })).filter(group => group.results.length > 0);

  // Calculate medal counts
  const medalCounts = {
    gold: results.filter(r => r.placement === 1).length,
    silver: results.filter(r => r.placement === 2).length,
    bronze: results.filter(r => r.placement === 3).length,
    total: results.length
  };

  const exportResults = () => {
    const csvContent = [
      ["Division", "Athlete", "Placement", "Medal"].join(","),
      ...results.map(result => [
        result.division?.name || "",
        result.athlete?.full_name || "",
        result.placement,
        result.medal_type || ""
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${tournament.name}-results.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Link href={`/tournaments/${tournament.id}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tournament
          </Button>
        </Link>
      </div>

      {/* Tournament Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">{tournament.name} - Results</h1>
            <div className="flex items-center space-x-4 text-muted-foreground">
              <span className="flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                {formatDate(tournament.tournament_date)}
              </span>
              <span className="flex items-center">
                <MapPin className="mr-2 h-4 w-4" />
                {tournament.location}
              </span>
            </div>
          </div>
          <div className="mt-4 md:mt-0">
            <Button onClick={exportResults} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Results
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Main Results */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="by-division" className="space-y-6">
            <TabsList>
              <TabsTrigger value="by-division">By Division</TabsTrigger>
              <TabsTrigger value="all-results">All Results</TabsTrigger>
            </TabsList>

            <TabsContent value="by-division" className="space-y-6">
              {resultsByDivision.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Results Available</h3>
                    <p className="text-muted-foreground">
                      Results will be posted once the tournament is completed.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                resultsByDivision.map(({ division, results: divisionResults }) => (
                  <Card key={division.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Trophy className="mr-2 h-5 w-5" />
                        {division.name}
                      </CardTitle>
                      <CardDescription>
                        {division.gender} • Age {division.min_age}-{division.max_age} • 
                        {division.belt_rank_min} - {division.belt_rank_max}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {divisionResults.map((result) => (
                          <div
                            key={result.id}
                            className={`flex items-center justify-between p-4 rounded-lg border ${
                              result.placement <= 3 ? 'bg-muted/50' : ''
                            }`}
                          >
                            <div className="flex items-center space-x-4">
                              <div className="text-2xl">
                                {getMedalIcon(result.placement)}
                              </div>
                              <div>
                                <h4 className="font-semibold">
                                  {result.athlete?.full_name}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Athlete ID: {result.athlete?.id}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {getPlacementBadge(result.placement)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="all-results" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Tournament Results</CardTitle>
                  <CardDescription>
                    Complete results sorted by placement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {results.sort((a, b) => a.placement - b.placement).map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">
                            {getMedalIcon(result.placement)}
                          </div>
                          <div>
                            <h4 className="font-semibold">
                              {result.athlete?.full_name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {result.division?.name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {getPlacementBadge(result.placement)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Medal Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Medal className="mr-2 h-5 w-5" />
                Medal Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl mb-1">🥇</div>
                  <div className="text-2xl font-bold text-yellow-500">{medalCounts.gold}</div>
                  <div className="text-xs text-muted-foreground">Gold</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🥈</div>
                  <div className="text-2xl font-bold text-gray-400">{medalCounts.silver}</div>
                  <div className="text-xs text-muted-foreground">Silver</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🥉</div>
                  <div className="text-2xl font-bold text-amber-600">{medalCounts.bronze}</div>
                  <div className="text-xs text-muted-foreground">Bronze</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🏆</div>
                  <div className="text-2xl font-bold">{medalCounts.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tournament Info */}
          <Card>
            <CardHeader>
              <CardTitle>Tournament Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Organizer:</span>
                <span className="font-medium text-sm">{tournament.organizer?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Divisions:</span>
                <span className="font-medium text-sm">{divisions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Participants:</span>
                <span className="font-medium text-sm">{results.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Date:</span>
                <span className="font-medium text-sm">
                  {new Date(tournament.tournament_date).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={exportResults} className="w-full" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Link href={`/tournaments/${tournament.id}`} className="w-full">
                <Button variant="outline" className="w-full">
                  View Tournament Details
                </Button>
              </Link>
              <Link href="/tournaments" className="w-full">
                <Button variant="outline" className="w-full">
                  Browse More Tournaments
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
