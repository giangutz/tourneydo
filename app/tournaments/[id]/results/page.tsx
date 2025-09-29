import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { TournamentResults } from "@/components/tournaments/tournament-results";

interface TournamentResultsPageProps {
  params: {
    id: string;
  };
}

export default async function TournamentResultsPage({ params }: TournamentResultsPageProps) {
  const supabase = await createClient();

  // Get tournament details
  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select(`
      *,
      organizer:profiles(full_name, organization)
    `)
    .eq("id", params.id)
    .single();

  if (error || !tournament) {
    notFound();
  }

  // Only show results for completed tournaments
  if (tournament.status !== "completed") {
    notFound();
  }

  // Get tournament results
  const { data: results } = await supabase
    .from("tournament_results")
    .select(`
      *,
      athlete:athletes(*),
      division:divisions(*)
    `)
    .eq("tournament_id", params.id)
    .order("division_id")
    .order("placement");

  // Get divisions with participants
  const { data: divisions } = await supabase
    .from("divisions")
    .select(`
      *,
      participants:division_participants(
        *,
        athlete:athletes(*)
      )
    `)
    .eq("tournament_id", params.id);

  return (
    <div className="min-h-screen bg-background">
      <TournamentResults 
        tournament={tournament}
        results={results || []}
        divisions={divisions || []}
      />
    </div>
  );
}
