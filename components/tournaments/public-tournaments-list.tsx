"use client";

import { useState, useMemo } from "react";
import { Tournament } from "@/lib/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Trophy, 
  Search, 
  Filter,
  Clock,
  DollarSign,
  Eye
} from "lucide-react";
import Link from "next/link";

interface PublicTournamentsListProps {
  tournaments: Tournament[];
}

export function PublicTournamentsList({ tournaments }: PublicTournamentsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  // Get unique locations for filter
  const locations = useMemo(() => {
    const uniqueLocations = [...new Set(tournaments.map(t => t.location))];
    return uniqueLocations.sort();
  }, [tournaments]);

  // Filter and sort tournaments
  const filteredTournaments = useMemo(() => {
    const filtered = tournaments.filter(tournament => {
      const matchesSearch = tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           tournament.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           tournament.organizer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || tournament.status === statusFilter;
      const matchesLocation = locationFilter === "all" || tournament.location === locationFilter;
      
      return matchesSearch && matchesStatus && matchesLocation;
    });

    // Sort tournaments
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(a.tournament_date).getTime() - new Date(b.tournament_date).getTime();
        case "name":
          return a.name.localeCompare(b.name);
        case "location":
          return a.location.localeCompare(b.location);
        default:
          return 0;
      }
    });

    return filtered;
  }, [tournaments, searchTerm, statusFilter, locationFilter, sortBy]);

  // Separate tournaments by status
  const upcomingTournaments = filteredTournaments.filter(t => 
    ["registration_open", "registration_closed", "weigh_in"].includes(t.status)
  );
  
  const ongoingTournaments = filteredTournaments.filter(t => 
    t.status === "in_progress"
  );
  
  const completedTournaments = filteredTournaments.filter(t => 
    t.status === "completed"
  );

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

  const TournamentCard = ({ tournament }: { tournament: Tournament }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <CardTitle className="text-xl">{tournament.name}</CardTitle>
            <CardDescription className="flex items-center space-x-4 text-sm">
              <span className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                {formatDate(tournament.tournament_date)}
              </span>
              <span className="flex items-center">
                <MapPin className="mr-1 h-4 w-4" />
                {tournament.location}
              </span>
            </CardDescription>
          </div>
          {getStatusBadge(tournament.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tournament.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {tournament.description}
            </p>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>
                Registration: {new Date(tournament.registration_deadline).toLocaleDateString()}
              </span>
            </div>
            
            {tournament.entry_fee > 0 && (
              <div className="flex items-center">
                <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>₱{tournament.entry_fee}</span>
              </div>
            )}
            
            {tournament.max_participants && (
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Max: {tournament.max_participants}</span>
              </div>
            )}
            
            <div className="flex items-center">
              <span className="text-muted-foreground">
                By: {tournament.organizer?.full_name || "Unknown"}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-muted-foreground">
              {tournament.organizer?.organization && (
                <span>{tournament.organizer.organization}</span>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Link href={`/tournaments/${tournament.id}`}>
                <Button variant="outline" size="sm">
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Button>
              </Link>
              
              {tournament.status === "completed" && (
                <Link href={`/tournaments/${tournament.id}/results`}>
                  <Button size="sm">
                    <Trophy className="mr-2 h-4 w-4" />
                    View Results
                  </Button>
                </Link>
              )}
              
              {tournament.status === "registration_open" && (
                <Link href={`/tournaments/${tournament.id}/register`}>
                  <Button size="sm">
                    Register Now
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Search & Filter Tournaments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search tournaments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="registration_open">Registration Open</SelectItem>
                  <SelectItem value="registration_closed">Registration Closed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="location">Location</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tournament Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingTournaments.length})
          </TabsTrigger>
          <TabsTrigger value="ongoing">
            Ongoing ({ongoingTournaments.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedTournaments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-6">
          {upcomingTournaments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Upcoming Tournaments</h3>
                <p className="text-muted-foreground">
                  Check back later for new tournament announcements.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ongoing" className="space-y-6">
          {ongoingTournaments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Ongoing Tournaments</h3>
                <p className="text-muted-foreground">
                  No tournaments are currently in progress.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {ongoingTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-6">
          {completedTournaments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Completed Tournaments</h3>
                <p className="text-muted-foreground">
                  Results from completed tournaments will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {completedTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
