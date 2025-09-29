import { createClient } from "@/lib/supabase/server";
import type { Team, Athlete, Profile } from "@/lib/types/database";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { TournamentRegistrationForm } from "@/components/tournaments/tournament-registration-form";

interface TournamentRegisterPageProps {
  params: {
    id: string;
  };
}

export default async function TournamentRegisterPage({ params }: TournamentRegisterPageProps) {
  const { userId } = await auth();
  const supabase = await createClient();
  
  // Await params in Next.js 15+
  const { id } = await params;

  // Get tournament details
  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select(`
      *,
      organizer:profiles(full_name, organization, email)
    `)
    .eq("id", id)
    .single();

  if (error || !tournament) {
    notFound();
  }

  // Check if registration is open (temporarily allow all statuses for testing)
  if (tournament.status === "completed" || tournament.status === "cancelled") {
    redirect(`/tournaments/${id}`);
  }

  // Check if registration deadline has passed (allow if no deadline set)
  if (tournament.registration_deadline && new Date(tournament.registration_deadline) < new Date()) {
    redirect(`/tournaments/${id}`);
  }

  let userProfile: Profile | null = null;
  let userTeams: Team[] = [];
  let teamAthletes: Athlete[] = [];

  // If user is logged in, get their profile and team info
  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    userProfile = profile;

    // If user is a coach, get all their teams and athletes
    if (profile?.role === "coach") {
      const { data: teams } = await supabase
        .from("teams")
        .select("*")
        .eq("coach_id", userId)
        .order("name", { ascending: true });

      userTeams = teams || [];

      if (userTeams.length > 0) {
        const { data: athletes } = await supabase
          .from("athletes")
          .select("*")
          .in("team_id", userTeams.map(t => t.id));

        teamAthletes = athletes || [];
      }
    }
  }

  // Get tournament divisions
  const { data: divisions } = await supabase
    .from("divisions")
    .select("*")
    .eq("tournament_id", id);

  // Get current registration count
  const { count: registrationCount } = await supabase
    .from("tournament_registrations")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", id);

  return (
    <div className="min-h-screen bg-background">
      <TournamentRegistrationForm 
        tournament={tournament}
        divisions={divisions || []}
        registrationCount={registrationCount || 0}
        userProfile={userProfile}
        userTeams={userTeams}
        teamAthletes={teamAthletes}
      />
    </div>
  );
}
