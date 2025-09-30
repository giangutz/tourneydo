"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Search,
  Filter,
  Clock,
  CheckCircle,
  Eye
} from "lucide-react";
import { createPublicSupabaseClient } from "@/lib/supabase";
import type { Tournament } from "@/types/database";

export default function PublicTournamentsPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const supabase = createPublicSupabaseClient();

      const { data: tournamentsData, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'published')
        .order('start_date', { ascending: true });

      if (error) throw error;

      setTournaments(tournamentsData || []);

      // Get participant counts for all tournaments
      const counts: Record<string, number> = {};
      for (const tournament of tournamentsData || []) {
        const { count } = await supabase
          .from('registrations')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournament.id);
        counts[tournament.id] = count ?? 0;
      }
      setParticipantCounts(counts);

    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntilStart = (startDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const diffTime = start.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const isRegistrationOpen = (tournament: Tournament) => {
    const now = new Date();
    const startDate = new Date(tournament.start_date);
    const registrationDeadline = tournament.registration_deadline
      ? new Date(tournament.registration_deadline)
      : startDate;

    return now <= registrationDeadline &&
           (tournament.max_participants ? participantCounts[tournament.id] < tournament.max_participants : true);
  };

  const filteredTournaments = tournaments.filter(tournament => {
    const matchesSearch = tournament.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tournament.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tournament.description && tournament.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" ||
                         (statusFilter === "open" && isRegistrationOpen(tournament)) ||
                         (statusFilter === "upcoming" && getDaysUntilStart(tournament.start_date) > 0) ||
                         (statusFilter === "ongoing" && getDaysUntilStart(tournament.start_date) <= 0);

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading tournaments...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
            <Trophy className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Taekwondo Tournaments</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent mb-4">
            Find Your Next Competition
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover taekwondo tournaments around the world and register to compete with athletes from your region.
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search tournaments by name, location, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tournaments</SelectItem>
                    <SelectItem value="open">Registration Open</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredTournaments.length} of {tournaments.length} tournaments
          </p>
        </div>

        {/* Tournaments Grid */}
        {filteredTournaments.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Trophy className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No tournaments found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search terms or filters to find more tournaments.
              </p>
              <Button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                variant="outline"
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament) => {
              const participantCount = participantCounts[tournament.id] || 0;
              const daysUntilStart = getDaysUntilStart(tournament.start_date);
              const registrationOpen = isRegistrationOpen(tournament);

              return (
                <Card
                  key={tournament.id}
                  className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer group"
                  onClick={() => router.push(`/tournaments/${tournament.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {tournament.title}
                        </CardTitle>
                        {tournament.description && (
                          <CardDescription className="mt-1 line-clamp-2">
                            {tournament.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-3">
                        {registrationOpen ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Open
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Closed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Key Information */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span>
                          {formatDate(tournament.start_date)}
                          {daysUntilStart > 0 && (
                            <span className="text-gray-500 ml-1">
                              ({daysUntilStart} days)
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-red-600" />
                        <span>{tournament.location}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-green-600" />
                        <span>
                          {participantCount}
                          {tournament.max_participants && ` / ${tournament.max_participants}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-yellow-600" />
                        <span>
                          {tournament.registration_fee
                            ? `${tournament.currency} ${tournament.registration_fee}`
                            : 'Free'
                          }
                        </span>
                      </div>
                    </div>

                    {/* Capacity Bar */}
                    {tournament.max_participants && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Capacity</span>
                          <span>{participantCount} / {tournament.max_participants}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min((participantCount / tournament.max_participants) * 100, 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      className="w-full bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/tournaments/${tournament.id}`);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Footer CTA */}
        {tournaments.length > 0 && (
          <Card className="bg-gradient-to-r from-blue-600 to-red-600 border-0 shadow-lg mt-12">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-4">
                Ready to Host Your Own Tournament?
              </h3>
              <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                Join Tourneydo and create professional taekwondo tournaments that reach athletes worldwide.
              </p>
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-blue-600 hover:bg-gray-100"
                onClick={() => router.push('/sign-up')}
              >
                Get Started
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
