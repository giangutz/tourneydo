"use client";

import { Tournament, Division } from "@/lib/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Trophy, 
  Clock,
  DollarSign,
  Mail,
  Building,
  ArrowLeft,
  FileText
} from "lucide-react";
import Link from "next/link";

interface PublicTournamentDetailsProps {
  tournament: Tournament & {
    organizer?: {
      full_name: string;
      organization?: string;
      email: string;
    };
  };
  divisions: Division[];
  registrationCount: number;
}

export function PublicTournamentDetails({ 
  tournament, 
  divisions, 
  registrationCount 
}: PublicTournamentDetailsProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      registration_open: { label: "Registration Open", variant: "default" as const },
      registration_closed: { label: "Registration Closed", variant: "secondary" as const },
      weigh_in: { label: "Weigh-in", variant: "outline" as const },
      in_progress: { label: "In Progress", variant: "destructive" as const },
      completed: { label: "Completed", variant: "outline" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, variant: "outline" as const };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Link href="/tournaments">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tournaments
          </Button>
        </Link>
      </div>

      {/* Tournament Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">{tournament.name}</h1>
            <div className="flex items-center space-x-4 text-muted-foreground">
              <span className="flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                {formatDate(tournament.tournament_date)}
              </span>
              <span className="flex items-center">
                <MapPin className="mr-2 h-4 w-4" />
                {tournament.location}
              </span>
              {tournament.entry_fee > 0 && (
                <span className="flex items-center">
                  <DollarSign className="mr-2 h-4 w-4" />
                  ₱{tournament.entry_fee} entry fee
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 md:mt-0">
            {getStatusBadge(tournament.status)}
          </div>
        </div>

        {tournament.description && (
          <p className="text-lg text-muted-foreground max-w-4xl">
            {tournament.description}
          </p>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Tournament Information */}
          <Card>
            <CardHeader>
              <CardTitle>Tournament Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Calendar className="mr-3 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Tournament Date</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(tournament.tournament_date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Clock className="mr-3 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Registration Deadline</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(tournament.registration_deadline)} at {formatTime(tournament.registration_deadline)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Calendar className="mr-3 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Weigh-in Date</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(tournament.weigh_in_date)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <MapPin className="mr-3 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {tournament.location}
                      </p>
                    </div>
                  </div>

                  {tournament.entry_fee > 0 && (
                    <div className="flex items-center">
                      <DollarSign className="mr-3 h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Entry Fee</p>
                        <p className="text-sm text-muted-foreground">
                          ${tournament.entry_fee}
                        </p>
                      </div>
                    </div>
                  )}

                  {tournament.max_participants && (
                    <div className="flex items-center">
                      <Users className="mr-3 h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Max Participants</p>
                        <p className="text-sm text-muted-foreground">
                          {tournament.max_participants} athletes
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {tournament.rules && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <FileText className="mr-2 h-4 w-4" />
                      Tournament Rules
                    </h4>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {tournament.rules}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Divisions */}
          {divisions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tournament Divisions</CardTitle>
                <CardDescription>
                  Competition categories and participant information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {divisions.map((division) => (
                    <div key={division.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">{division.name}</h4>
                        <Badge variant="outline">
                          {division.participants?.length || 0} participants
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                        <span>Age: {division.min_age}-{division.max_age}</span>
                        <span>Gender: {division.gender}</span>
                        <span>Belt: {division.belt_rank_min} - {division.belt_rank_max}</span>
                        {division.min_weight && division.max_weight && (
                          <span>Weight: {division.min_weight}-{division.max_weight}kg</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Registration Status */}
          <Card>
            <CardHeader>
              <CardTitle>Registration Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">
                  {registrationCount}
                </div>
                <p className="text-sm text-muted-foreground">
                  Athletes Registered
                </p>
              </div>

              {tournament.max_participants && (
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ 
                      width: `${Math.min((registrationCount / tournament.max_participants) * 100, 100)}%` 
                    }}
                  />
                </div>
              )}

              <div className="space-y-2">
                {(tournament.status === "registration_open" || tournament.status === "draft") && (
                  <Link href={`/tournaments/${tournament.id}/register`} className="w-full">
                    <Button className="w-full">
                      Register Now
                    </Button>
                  </Link>
                )}

                {tournament.status === "completed" && (
                  <Link href={`/tournaments/${tournament.id}/results`} className="w-full">
                    <Button className="w-full">
                      <Trophy className="mr-2 h-4 w-4" />
                      View Results
                    </Button>
                  </Link>
                )}

                {tournament.status === "in_progress" && (
                  <Link href={`/tournaments/${tournament.id}/live`} className="w-full">
                    <Button className="w-full">
                      <Trophy className="mr-2 h-4 w-4" />
                      Live Results
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Organizer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Organizer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="font-medium">{tournament.organizer?.full_name}</p>
                
                {tournament.organizer?.organization && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Building className="mr-2 h-4 w-4" />
                    {tournament.organizer.organization}
                  </div>
                )}

                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="mr-2 h-4 w-4" />
                  <a 
                    href={`mailto:${tournament.organizer?.email}`}
                    className="hover:underline"
                  >
                    {tournament.organizer?.email}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Divisions:</span>
                <span className="font-medium">{divisions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Registered:</span>
                <span className="font-medium">{registrationCount}</span>
              </div>
              {tournament.max_participants && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Capacity:</span>
                  <span className="font-medium">{tournament.max_participants}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <span className="font-medium capitalize">
                  {tournament.status.replace("_", " ")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
