import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { PublicTournamentDetails } from "@/components/tournaments/public-tournament-details";
import { CoachTournamentView } from "@/components/tournaments/coach-tournament-view";

interface TournamentPageProps {
  params: {
    id: string;
  };
}

export default async function PublicTournamentPage({ params }: TournamentPageProps) {
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

  // Only show published tournaments
  if (tournament.status === "draft") {
    notFound();
  }

  // Get user profile if authenticated
  let userProfile = null;
  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    userProfile = profile;
  }

  // If user is a coach, show coach view
  if (userProfile && userProfile.role === "coach") {
    return (
      <div className="min-h-screen bg-background">
        <CoachTournamentView 
          tournament={tournament}
          coachId={userProfile.id}
        />
      </div>
    );
  }

  // Get tournament divisions for public view
  const { data: divisions } = await supabase
    .from("divisions")
    .select(`
      *,
      participants:division_participants(
        *,
        athlete:athletes(*),
        registration:tournament_registrations(*)
      )
    `)
    .eq("tournament_id", id);

  // Get tournament registrations count
  const { count: registrationCount } = await supabase
    .from("tournament_registrations")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", id);

  return (
    <div className="min-h-screen bg-background">
      <PublicTournamentDetails 
        tournament={tournament}
        divisions={divisions || []}
        registrationCount={registrationCount || 0}
      />
    </div>
  );
}
