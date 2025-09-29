"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Plus, 
  Trash2, 
  UserPlus, 
  Trophy,
  AlertCircle,
  CheckCircle
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  entry_fee: number;
  registration_deadline: string;
  status: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
}

interface Athlete {
  id: string;
  full_name: string;
  gender: string;
  age: number;
  belt_rank: string;
  weight: number;
  height: number;
}

interface RegistrationData {
  athlete_id: string;
  team_id: string;
  athlete?: Athlete;
  team?: Team;
}

interface AthleteRegistrationFormProps {
  tournament: Tournament;
  coachId: string;
  onRegistrationComplete: () => void;
}

export function AthleteRegistrationForm({ 
  tournament, 
  coachId, 
  onRegistrationComplete 
}: AthleteRegistrationFormProps) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationData[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchCoachData();
  }, [coachId]);

  const fetchCoachData = async () => {
    setLoading(true);
    try {
      // Fetch coach's athletes
      const { data: athletesData, error: athletesError } = await supabase
        .from("athletes")
        .select("*")
        .eq("coach_id", coachId)
        .order("full_name");

      if (athletesError) throw athletesError;
      setAthletes(athletesData || []);

      // Fetch coach's teams
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .eq("coach_id", coachId)
        .order("name");

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Check existing registrations
      const { data: existingRegs, error: regsError } = await supabase
        .from("tournament_registrations")
        .select(`
          *,
          athlete:athletes(*),
          team:teams(*)
        `)
        .eq("tournament_id", tournament.id)
        .in("athlete_id", (athletesData || []).map(a => a.id));

      if (regsError) throw regsError;
      setRegistrations(existingRegs || []);

    } catch (error) {
      console.error("Error fetching coach data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAthleteToggle = (athleteId: string) => {
    setSelectedAthletes(prev => 
      prev.includes(athleteId) 
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const handleBulkRegister = async () => {
    if (!selectedTeam || selectedAthletes.length === 0) return;

    setSubmitting(true);
    try {
      const registrationData = selectedAthletes.map(athleteId => ({
        tournament_id: tournament.id,
        athlete_id: athleteId,
        team_id: selectedTeam,
        payment_status: "pending",
        registration_date: new Date().toISOString()
      }));

      const { error } = await supabase
        .from("tournament_registrations")
        .insert(registrationData);

      if (error) throw error;

      // Refresh data
      await fetchCoachData();
      setSelectedAthletes([]);
      setSelectedTeam("");
      onRegistrationComplete();

      alert(`Successfully registered ${selectedAthletes.length} athletes!`);
    } catch (error) {
      console.error("Error registering athletes:", error);
      alert("Error registering athletes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnregister = async (registrationId: string) => {
    if (!confirm("Are you sure you want to unregister this athlete?")) return;

    try {
      const { error } = await supabase
        .from("tournament_registrations")
        .delete()
        .eq("id", registrationId);

      if (error) throw error;
      await fetchCoachData();
    } catch (error) {
      console.error("Error unregistering athlete:", error);
      alert("Error unregistering athlete. Please try again.");
    }
  };

  const getAthleteStatus = (athleteId: string) => {
    return registrations.find(reg => reg.athlete_id === athleteId);
  };

  const isRegistrationOpen = tournament.status === "registration_open";
  const isDeadlinePassed = new Date() > new Date(tournament.registration_deadline);
  const canRegister = isRegistrationOpen && !isDeadlinePassed;

  const unregisteredAthletes = athletes.filter(athlete => 
    !registrations.some(reg => reg.athlete_id === athlete.id)
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your athletes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Registration Status Alert */}
      {!canRegister && (
        <div className="flex items-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-amber-600 mr-3" />
          <div>
            <div className="font-medium text-amber-800">Registration Not Available</div>
            <div className="text-sm text-amber-700">
              {!isRegistrationOpen 
                ? "Registration is not currently open for this tournament."
                : "Registration deadline has passed."
              }
            </div>
          </div>
        </div>
      )}

      {/* Bulk Registration */}
      {canRegister && unregisteredAthletes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="h-5 w-5 mr-2" />
              Register Athletes
            </CardTitle>
            <CardDescription>
              Select athletes and team to register for this tournament
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Team Selection */}
            <div className="space-y-2">
              <Label>Select Team *</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Athlete Selection */}
            <div className="space-y-3">
              <Label>Select Athletes to Register</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {unregisteredAthletes.map((athlete) => (
                  <div
                    key={athlete.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedAthletes.includes(athlete.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => handleAthleteToggle(athlete.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{athlete.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {athlete.gender} • {athlete.age}y • {athlete.weight}kg
                        </div>
                        <Badge variant="outline" className="mt-1">
                          {athlete.belt_rank.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                      {selectedAthletes.includes(athlete.id) && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Registration Summary */}
            {selectedAthletes.length > 0 && selectedTeam && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Registration Summary</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedAthletes.length} athletes • {teams.find(t => t.id === selectedTeam)?.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      ₱{(selectedAthletes.length * tournament.entry_fee).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Fee</div>
                  </div>
                </div>
              </div>
            )}

            {/* Register Button */}
            <Button
              onClick={handleBulkRegister}
              disabled={!selectedTeam || selectedAthletes.length === 0 || submitting}
              className="w-full"
              size="lg"
            >
              {submitting ? "Registering..." : `Register ${selectedAthletes.length} Athletes`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Registered Athletes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            Registered Athletes ({registrations.length})
          </CardTitle>
          <CardDescription>
            Athletes you've registered for this tournament
          </CardDescription>
        </CardHeader>
        <CardContent>
          {registrations.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No athletes registered</h3>
              <p className="text-muted-foreground">
                Register your athletes to participate in this tournament.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {registrations.map((registration) => (
                <div key={registration.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{registration.athlete?.full_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {registration.team?.name} • {registration.athlete?.gender} • 
                      {registration.athlete?.age} years • {registration.athlete?.weight}kg
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="outline">
                        {registration.athlete?.belt_rank.replace("_", " ").toUpperCase()}
                      </Badge>
                      <Badge variant={registration.payment_status === "paid" ? "default" : 
                                    registration.payment_status === "pending_approval" ? "secondary" : "outline"}>
                        {registration.payment_status === "pending_approval" ? "Pending" : 
                         registration.payment_status.toUpperCase()}
                      </Badge>
                      {registration.checked_in && (
                        <Badge variant="secondary">Checked In</Badge>
                      )}
                      {registration.weighed_in && (
                        <Badge variant="default">Weighed In</Badge>
                      )}
                    </div>
                  </div>
                  
                  {canRegister && registration.payment_status === "pending" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleUnregister(registration.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* No Athletes Message */}
      {athletes.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No athletes found</h3>
            <p className="text-muted-foreground mb-4">
              You need to add athletes to your roster before registering for tournaments.
            </p>
            <Button asChild>
              <a href="/dashboard/athletes">
                <Plus className="h-4 w-4 mr-2" />
                Add Athletes
              </a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
