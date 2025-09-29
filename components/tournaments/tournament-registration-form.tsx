"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tournament, Division, Profile, Team, Athlete } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  MapPin, 
  DollarSign,
  ArrowLeft,
  UserPlus,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

interface TournamentRegistrationFormProps {
  tournament: Tournament & {
    organizer?: {
      full_name: string;
      organization?: string;
      email: string;
    };
  };
  divisions: Division[];
  registrationCount: number;
  userProfile: Profile | null;
  userTeams: Team[];
  teamAthletes: Athlete[];
}

export function TournamentRegistrationForm({ 
  tournament, 
  divisions, 
  registrationCount,
  userProfile,
  userTeams,
  teamAthletes
}: TournamentRegistrationFormProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = createClient();
  
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>(userTeams?.[0]?.id || "");
  const [guestRegistration, setGuestRegistration] = useState({
    athleteName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    beltRank: "",
    weight: "",
    emergencyContact: "",
    emergencyPhone: "",
    notes: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleAthleteSelection = (athleteId: string, checked: boolean) => {
    if (checked) {
      setSelectedAthletes(prev => [...prev, athleteId]);
    } else {
      setSelectedAthletes(prev => prev.filter(id => id !== athleteId));
    }
  };

  const handleGuestInputChange = (field: string, value: string) => {
    setGuestRegistration(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (userProfile?.role === "coach" && selectedAthletes.length > 0) {
        // Register selected team athletes
        const registrations = selectedAthletes.map(athleteId => ({
          tournament_id: tournament.id,
          athlete_id: athleteId,
          team_id: selectedTeamId || null,
          payment_status: "pending",
          payment_amount: tournament.entry_fee,
          notes: `Registered by coach: ${userProfile.full_name}`
        }));

        const { error: regError } = await supabase
          .from("tournament_registrations")
          .insert(registrations);

        if (regError) throw regError;

        setSuccess(true);
        setTimeout(() => {
          router.push(`/tournaments/${tournament.id}`);
        }, 2000);

      } else if (!user) {
        // Guest registration - create athlete and register
        if (!guestRegistration.athleteName || !guestRegistration.email || 
            !guestRegistration.dateOfBirth || !guestRegistration.gender || 
            !guestRegistration.beltRank) {
          setError("Please fill in all required fields");
          return;
        }

        // Create guest athlete
        const { data: athlete, error: athleteError } = await supabase
          .from("athletes")
          .insert({
            full_name: guestRegistration.athleteName,
            date_of_birth: guestRegistration.dateOfBirth,
            gender: guestRegistration.gender,
            // Map UI belt ranks to DB values (temporary: map red -> brown, black -> black_1)
            belt_rank: guestRegistration.beltRank === 'black' 
              ? 'black_1' 
              : guestRegistration.beltRank === 'red' 
                ? 'brown' 
                : guestRegistration.beltRank,
            weight_class: guestRegistration.weight ? parseFloat(guestRegistration.weight) : null,
            emergency_contact_name: guestRegistration.emergencyContact,
            emergency_contact_phone: guestRegistration.emergencyPhone,
          })
          .select()
          .single();

        if (athleteError) throw athleteError;

        // Register the athlete
        const { error: regError } = await supabase
          .from("tournament_registrations")
          .insert({
            tournament_id: tournament.id,
            athlete_id: athlete.id,
            team_id: selectedTeamId || null,
            payment_status: "pending",
            payment_amount: tournament.entry_fee,
            notes: `Guest registration: ${guestRegistration.email}, Phone: ${guestRegistration.phone}${guestRegistration.notes ? `, Notes: ${guestRegistration.notes}` : ''}`
          });

        if (regError) throw regError;

        setSuccess(true);
        setTimeout(() => {
          router.push(`/tournaments/${tournament.id}`);
        }, 3000);

      } else {
        setError("Invalid registration type");
      }

    } catch (error: unknown) {
      console.error("Registration error:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An error occurred during registration");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-4">Registration Successful!</h2>
            <p className="text-muted-foreground mb-6">
              Your tournament registration has been submitted successfully. 
              You will receive a confirmation email shortly.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Tournament: {tournament.name}</p>
              <p>Date: {formatDate(tournament.tournament_date)}</p>
              {tournament.entry_fee > 0 && (
                <p>Entry Fee: ${tournament.entry_fee} (Payment pending)</p>
              )}
            </div>
            <div className="mt-6">
              <Link href={`/tournaments/${tournament.id}`}>
                <Button>View Tournament Details</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <h1 className="text-3xl font-bold mb-2">Register for {tournament.name}</h1>
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

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Registration Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Coach Registration */}
            {userProfile?.role === "coach" && teamAthletes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserPlus className="mr-2 h-5 w-5" />
                    Register Team Athletes
                  </CardTitle>
                  <CardDescription>
                    Select athletes from your team to register for this tournament
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Team selection with search */}
                  {userTeams && userTeams.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="teamSelect">Select Team</Label>
                      <Input
                        placeholder="Search team..."
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                      />
                      <select
                        id="teamSelect"
                        className="w-full p-2 border rounded-md"
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                      >
                        <option value="">Select team</option>
                        {userTeams
                          .filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase()))
                          .map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                          ))}
                      </select>
                    </div>
                  )}

                  {teamAthletes
                    .filter(a => !selectedTeamId || a.team_id === selectedTeamId)
                    .map((athlete) => (
                    <div key={athlete.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={athlete.id}
                        checked={selectedAthletes.includes(athlete.id)}
                        onCheckedChange={(checked) => 
                          handleAthleteSelection(athlete.id, checked as boolean)
                        }
                      />
                      <div className="flex-1">
                        <label htmlFor={athlete.id} className="cursor-pointer">
                          <h4 className="font-medium">{athlete.full_name}</h4>
                          <div className="text-sm text-muted-foreground">
                            {athlete.gender} • {athlete.belt_rank?.replace("_", " ").toUpperCase()} • 
                            {athlete.weight && ` ${athlete.weight}kg`}
                            {athlete.date_of_birth && ` • Age: ${new Date().getFullYear() - new Date(athlete.date_of_birth).getFullYear()}`}
                          </div>
                        </label>
                      </div>
                      {tournament.entry_fee > 0 && (
                        <Badge variant="outline">₱{tournament.entry_fee}</Badge>
                      )}
                    </div>
                  ))}
                  
                  {selectedAthletes.length > 0 && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">
                        Selected: {selectedAthletes.length} athlete(s)
                      </p>
                      {tournament.entry_fee > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Total fee: ₱{tournament.entry_fee * selectedAthletes.length}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Guest Registration */}
            {(!user || userProfile?.role !== "coach" || teamAthletes.length === 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserPlus className="mr-2 h-5 w-5" />
                    Athlete Registration
                  </CardTitle>
                  <CardDescription>
                    {!user ? "Register as a guest athlete" : "Register yourself for this tournament"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="athleteName">Athlete Name *</Label>
                      <Input
                        id="athleteName"
                        value={guestRegistration.athleteName}
                        onChange={(e) => handleGuestInputChange("athleteName", e.target.value)}
                        placeholder="Full name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={guestRegistration.email}
                        onChange={(e) => handleGuestInputChange("email", e.target.value)}
                        placeholder="athlete@example.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={guestRegistration.phone}
                        onChange={(e) => handleGuestInputChange("phone", e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={guestRegistration.dateOfBirth}
                        onChange={(e) => handleGuestInputChange("dateOfBirth", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender *</Label>
                      <select
                        id="gender"
                        value={guestRegistration.gender}
                        onChange={(e) => handleGuestInputChange("gender", e.target.value)}
                        className="w-full p-2 border rounded-md"
                        required
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="beltRank">Belt Rank *</Label>
                      <select
                        id="beltRank"
                        value={guestRegistration.beltRank}
                        onChange={(e) => handleGuestInputChange("beltRank", e.target.value)}
                        className="w-full p-2 border rounded-md"
                        required
                      >
                        <option value="">Select belt rank</option>
                        <option value="white">White</option>
                        <option value="yellow">Yellow</option>
                        <option value="blue">Blue</option>
                        <option value="red">Red</option>
                        <option value="brown">Brown</option>
                        <option value="black">Black</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        value={guestRegistration.weight}
                        onChange={(e) => handleGuestInputChange("weight", e.target.value)}
                        placeholder="65.5"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergencyContact">Emergency Contact</Label>
                      <Input
                        id="emergencyContact"
                        value={guestRegistration.emergencyContact}
                        onChange={(e) => handleGuestInputChange("emergencyContact", e.target.value)}
                        placeholder="Contact name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                      <Input
                        id="emergencyPhone"
                        type="tel"
                        value={guestRegistration.emergencyPhone}
                        onChange={(e) => handleGuestInputChange("emergencyPhone", e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={guestRegistration.notes}
                      onChange={(e) => handleGuestInputChange("notes", e.target.value)}
                      placeholder="Any additional information or special requirements"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || (userProfile?.role === "coach" && selectedAthletes.length === 0)}
            >
              {isLoading ? "Processing Registration..." : "Complete Registration"}
            </Button>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Registration Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Registration Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tournament:</span>
                  <span className="font-medium text-sm">{tournament.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Date:</span>
                  <span className="font-medium text-sm">
                    {new Date(tournament.tournament_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Location:</span>
                  <span className="font-medium text-sm">{tournament.location}</span>
                </div>
                {tournament.entry_fee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Entry Fee:</span>
                    <span className="font-medium text-sm">₱{tournament.entry_fee}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Current Registrations:</span>
                  <span className="font-medium text-sm">{registrationCount}</span>
                </div>
                {tournament.max_participants && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Max Participants:</span>
                    <span className="font-medium text-sm">{tournament.max_participants}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Registration Deadline:</span>
                  <span className="font-medium text-sm">
                    {new Date(tournament.registration_deadline).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tournament Divisions */}
          {divisions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tournament Divisions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {divisions.map((division) => (
                    <div key={division.id} className="p-3 border rounded-lg">
                      <h4 className="font-medium text-sm">{division.name}</h4>
                      <div className="text-xs text-muted-foreground mt-1">
                        {division.gender} • Age {division.min_age}-{division.max_age} • 
                        {division.belt_rank_min} - {division.belt_rank_max}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Important Information */}
          <Card>
            <CardHeader>
              <CardTitle>Important Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Registration Deadline</p>
                  <p className="text-muted-foreground">
                    Registration closes on {new Date(tournament.registration_deadline).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Weigh-in Required</p>
                  <p className="text-muted-foreground">
                    All athletes must attend weigh-in on {new Date(tournament.weigh_in_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {tournament.entry_fee > 0 && (
                <div className="flex items-start space-x-2">
                  <DollarSign className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Payment</p>
                    <p className="text-muted-foreground">
                      Entry fee of ₱{tournament.entry_fee} is due upon registration
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
