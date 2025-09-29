import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TournamentManagement } from "@/components/tournaments/tournament-management";

interface TournamentPageProps {
  params: {
    id: string;
  };
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/auth/sign-in");
  }

  const supabase = await createClient();

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile) {
    redirect("/auth/sign-in");
  }

  // Get tournament details
  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select(`
      *,
      organizer:profiles(*)
    `)
    .eq("id", params.id)
    .single();

  if (error || !tournament) {
    redirect("/dashboard/tournaments");
  }

  // Check if user has access to this tournament
  const hasAccess = 
    profile.role === "organizer" && tournament.organizer_id === profile.id ||
    profile.role === "coach" ||
    profile.role === "athlete";

  if (!hasAccess) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-7xl mx-auto">
      <TournamentManagement tournament={tournament} userProfile={profile} />
    </div>
  );
}
