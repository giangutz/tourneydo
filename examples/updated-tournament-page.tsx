// Example: Updated tournament page using new query structure
// File: app/tournaments/[id]/page.tsx

import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  tournamentQueries,
  profileQueries,
  registrationQueries,
  Team
} from "@/lib/supabase/actions";
import { PublicTournamentDetails } from "@/components/tournaments/public-tournament-details";

interface TournamentPageProps {
  params: {
    id: string;
  };
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  const { userId } = await auth();
  const { id } = await params;

  // Get tournament with organizer info using new query function
  const tournament = await tournamentQueries.getById(id);

  if (!tournament) {
    notFound();
  }

  // Get user profile if authenticated
  let userProfile = null;
  if (userId) {
    userProfile = await profileQueries.getByClerkId(userId);
  }

  // Get registration statistics
  const registrationStats = await registrationQueries.getStats(id);

  return (
    <div className="min-h-screen bg-background">
      <PublicTournamentDetails
        tournament={tournament}
        registrationCount={registrationStats.total}
        userProfile={userProfile}
      />
    </div>
  );
}

// Example: Updated registration form component
// File: components/tournaments/tournament-registration-form.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  tournamentQueries,
  athleteQueries,
  registrationQueries,
  type Tournament,
  type Athlete
} from "@/lib/supabase/actions";

interface RegistrationFormProps {
  tournament: Tournament;
  userTeams: Team[];
  teamAthletes: Athlete[];
}

export function TournamentRegistrationForm({
  tournament,
  userTeams,
  teamAthletes
}: RegistrationFormProps) {
  const { user } = useUser();
  const router = useRouter();
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create registrations using new query function
      const registrationsData = selectedAthletes.map((athleteId) => ({
        tournament_id: tournament.id,
        athlete_id: athleteId,
        team_id: userTeams[0]?.id,
        payment_status: "pending" as const,
        payment_amount: tournament.entry_fee
      }));

      const registrations = await registrationQueries.createBulk(
        registrationsData
      );

      if (registrations.length > 0) {
        router.push(`/tournaments/${tournament.id}?registered=true`);
      }
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Rest of component...
  return <form onSubmit={handleSubmit}>{/* Form content */}</form>;
}

// Example: Updated athlete management
// File: components/athletes/athlete-list.tsx

import { useEffect, useState } from "react";
import { athleteQueries, type Athlete } from "@/lib/supabase/actions";

interface AthleteListProps {
  teamId: string;
}

export function AthleteList({ teamId }: AthleteListProps) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAthletes = async () => {
      try {
        const teamAthletes = await athleteQueries.getByTeam(teamId);
        setAthletes(teamAthletes);
      } catch (error) {
        console.error("Error loading athletes:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAthletes();
  }, [teamId]);

  const handleTransferAthlete = async (
    athleteId: string,
    newTeamId: string
  ) => {
    const success = await athleteQueries.transfer(athleteId, newTeamId);
    if (success) {
      // Refresh the list
      const updatedAthletes = await athleteQueries.getByTeam(teamId);
      setAthletes(updatedAthletes);
    }
  };

  if (loading) {
    return <div>Loading athletes...</div>;
  }

  return (
    <div className="space-y-4">
      {athletes.map((athlete) => (
        <div key={athlete.id} className="p-4 border rounded-lg">
          <h3 className="font-semibold">{athlete.full_name}</h3>
          <p className="text-sm text-muted-foreground">
            {athlete.gender} • {athlete.belt_rank} •
            {athlete.weight && ` ${athlete.weight}kg`}
            {athlete.date_of_birth &&
              ` • Age: ${athleteQueries.calculateAge(athlete.date_of_birth)}`}
          </p>
          {athlete.team && <p className="text-sm">Team: {athlete.team.name}</p>}
        </div>
      ))}
    </div>
  );
}

// Example: Server action for creating tournament
// File: lib/actions/tournaments.ts

("use server");

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  tournamentQueries,
  profileQueries,
  type Tournament
} from "@/lib/supabase/actions";

export async function createTournament(formData: FormData) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Get user profile
  const profile = await profileQueries.getByClerkId(userId);

  if (!profile || profile.role !== "organizer") {
    throw new Error("Only organizers can create tournaments");
  }

  const tournamentData = {
    organizer_id: profile.id,
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    location: formData.get("location") as string,
    tournament_date: formData.get("tournament_date") as string,
    registration_deadline: formData.get("registration_deadline") as string,
    weigh_in_date: formData.get("weigh_in_date") as string,
    entry_fee: parseFloat(formData.get("entry_fee") as string),
    max_participants: parseInt(formData.get("max_participants") as string),
    is_public: formData.get("is_public") === "on",
    status: "draft" as const
  };

  const tournament = await tournamentQueries.create(tournamentData);

  if (!tournament) {
    throw new Error("Failed to create tournament");
  }

  revalidatePath("/dashboard/tournaments");
  redirect(`/dashboard/tournaments/${tournament.id}`);
}
