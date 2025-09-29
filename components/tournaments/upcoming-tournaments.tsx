import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Trophy, ArrowRight } from "lucide-react";
import Link from "next/link";

export async function UpcomingTournaments() {
  const supabase = await createClient();

  // Get upcoming tournaments (next 6, exclude drafts)
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select(`
      *,
      organizer:profiles(full_name, organization)
    `)
    .in("status", ["registration_open", "registration_closed", "weigh_in"])
    .gte("tournament_date", new Date().toISOString().split("T")[0])
    .order("tournament_date", { ascending: true })
    .limit(6);

  if (!tournaments || tournaments.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Upcoming Tournaments</h3>
        <p className="text-muted-foreground mb-6">
          Check back later for new tournament announcements.
        </p>
        <Link href="/tournaments">
          <Button variant="outline">
            Browse All Tournaments
          </Button>
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      registration_open: { label: "Registration Open", variant: "default" as const },
      registration_closed: { label: "Registration Closed", variant: "secondary" as const },
      weigh_in: { label: "Weigh-in", variant: "outline" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, variant: "outline" as const };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((tournament) => (
          <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-lg line-clamp-2">{tournament.name}</CardTitle>
                  <CardDescription className="flex items-center space-x-4 text-sm">
                    <span className="flex items-center">
                      <Calendar className="mr-1 h-3 w-3" />
                      {formatDate(tournament.tournament_date)}
                    </span>
                    <span className="flex items-center">
                      <MapPin className="mr-1 h-3 w-3" />
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
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    By: {tournament.organizer?.full_name || "Unknown"}
                  </span>
                  {tournament.entry_fee > 0 && (
                    <span className="font-medium">₱{tournament.entry_fee}</span>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Link href={`/tournaments/${tournament.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                  
                  {tournament.status === "registration_open" && (
                    <Link href={`/tournaments/${tournament.id}/register`}>
                      <Button size="sm">
                        Register
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View All Button */}
      <div className="text-center">
        <Link href="/tournaments">
          <Button variant="outline" size="lg">
            View All Tournaments
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
