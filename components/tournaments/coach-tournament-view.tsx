"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CoachTeamSelector } from "./coach-team-selector";
import { AthleteRegistrationForm } from "./athlete-registration-form";
import { 
  Trophy, 
  Users, 
  Calendar, 
  MapPin, 
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  description: string;
  location: string;
  tournament_date: string;
  registration_deadline: string;
  weigh_in_date: string;
  entry_fee: number;
  status: string;
  max_participants: number;
  rules: string;
  payment_methods?: string[];
  organizer: {
    full_name: string;
    organization?: string;
    email: string;
  };
}

interface CoachTournamentViewProps {
  tournament: Tournament;
  coachId: string;
}

export function CoachTournamentView({ tournament, coachId }: CoachTournamentViewProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchCoachData();
  }, [coachId, tournament.id]);

  const fetchCoachData = async () => {
    setLoading(true);
    try {
      // Get coach's registrations for this tournament
      const { data: registrations, error: regError } = await supabase
        .from("tournament_registrations")
        .select(`
          *,
          athlete:athletes(*),
          team:teams(*)
        `)
        .eq("tournament_id", tournament.id)
        .eq("team.coach_id", coachId);

      if (regError) throw regError;
      setMyRegistrations(registrations || []);

      // Get payment status
      const { data: payments, error: payError } = await supabase
        .from("team_payments")
        .select("*")
        .eq("tournament_id", tournament.id)
        .eq("coach_id", coachId);

      if (payError) throw payError;
      setPaymentStatus(payments || []);

    } catch (error) {
      console.error("Error fetching coach data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-500", text: "Draft" },
      registration_open: { color: "bg-green-500", text: "Registration Open" },
      registration_closed: { color: "bg-yellow-500", text: "Registration Closed" },
      weigh_in: { color: "bg-blue-500", text: "Weigh-in Period" },
      in_progress: { color: "bg-purple-500", text: "In Progress" },
      completed: { color: "bg-gray-700", text: "Completed" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const getRegistrationStats = () => {
    const total = myRegistrations.length;
    const paid = myRegistrations.filter((r: any) => r.payment_status === 'paid').length;
    const pending = myRegistrations.filter((r: any) => r.payment_status === 'pending_approval').length;
    const checkedIn = myRegistrations.filter((r: any) => r.checked_in).length;
    const weighedIn = myRegistrations.filter((r: any) => r.weighed_in).length;

    return { total, paid, pending, checkedIn, weighedIn };
  };

  const stats = getRegistrationStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading tournament information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Tournament Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{tournament.name}</h1>
            <p className="text-blue-100 mb-4">{tournament.description}</p>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDate(tournament.tournament_date)}
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {tournament.location}
              </div>
              {getStatusBadge(tournament.status)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatCurrency(tournament.entry_fee)}</div>
            <div className="text-blue-100">Entry Fee per Athlete</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              My Athletes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Checked In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.checkedIn}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Trophy className="h-4 w-4 mr-2" />
              Weighed In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.weighedIn}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Tournament Info</TabsTrigger>
          <TabsTrigger value="register">Register Athletes</TabsTrigger>
          <TabsTrigger value="payment">Payment Center</TabsTrigger>
          <TabsTrigger value="athletes">My Athletes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tournament Details</CardTitle>
                <CardDescription>Important dates and information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Tournament Date:</span>
                    <span>{formatDate(tournament.tournament_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Registration Deadline:</span>
                    <span>{formatDate(tournament.registration_deadline)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Weigh-in Date:</span>
                    <span>{formatDate(tournament.weigh_in_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Entry Fee:</span>
                    <span>{formatCurrency(tournament.entry_fee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Max Participants:</span>
                    <span>{tournament.max_participants || "Unlimited"}</span>
                  </div>
                </div>

                {tournament.rules && (
                  <div className="pt-4 border-t">
                    <div className="font-medium mb-2">Rules & Regulations</div>
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      {tournament.rules}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Organizer Information</CardTitle>
                <CardDescription>Contact details and organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="font-medium">{tournament.organizer.full_name}</div>
                  {tournament.organizer.organization && (
                    <div className="text-sm text-muted-foreground">
                      {tournament.organizer.organization}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">Contact Email:</div>
                  <div className="text-sm text-muted-foreground">
                    {tournament.organizer.email}
                  </div>
                </div>

                {tournament.payment_methods && tournament.payment_methods.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Accepted Payment Methods:</div>
                    <div className="flex flex-wrap gap-2">
                      {tournament.payment_methods.map((method) => (
                        <Badge key={method} variant="outline">
                          {method}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="register" className="space-y-6">
          <AthleteRegistrationForm
            tournament={tournament}
            coachId={coachId}
            onRegistrationComplete={fetchCoachData}
          />
        </TabsContent>

        <TabsContent value="payment" className="space-y-6">
          <CoachTeamSelector
            tournament={tournament}
            coachId={coachId}
            onPaymentUpdate={fetchCoachData}
          />
        </TabsContent>

        <TabsContent value="athletes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Registered Athletes</CardTitle>
              <CardDescription>
                Athletes you've registered for this tournament
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myRegistrations.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No athletes registered</h3>
                  <p className="text-muted-foreground">
                    You haven't registered any athletes for this tournament yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myRegistrations.map((registration: any) => (
                    <div key={registration.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{registration.athlete.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {registration.team.name} • {registration.athlete.gender} • 
                          {registration.athlete.age} years • {registration.athlete.weight}kg
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {registration.athlete.belt_rank.replace("_", " ").toUpperCase()}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant={registration.payment_status === "paid" ? "default" : 
                                      registration.payment_status === "pending_approval" ? "secondary" : "outline"}>
                          {registration.payment_status === "pending_approval" ? "Pending" : 
                           registration.payment_status.toUpperCase()}
                        </Badge>
                        
                        {registration.checked_in && (
                          <Badge variant="secondary">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Checked In
                          </Badge>
                        )}
                        
                        {registration.weighed_in && (
                          <Badge variant="default">
                            <Trophy className="h-3 w-3 mr-1" />
                            Weighed In
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
      </Tabs>
    </div>
  );
}
