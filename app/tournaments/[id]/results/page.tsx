import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { TournamentResults } from "@/components/tournaments/tournament-results";

export default async function TournamentResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params; 
  // Get tournament details
  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select(
      `
      *,
      organizer:profiles(full_name, organization)
    `
    )
    .eq("id", id)
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
    .select(
      `
      *,
      athlete:athletes(*),
      division:divisions(*)
    `
    )
    .eq("tournament_id", id)
    .order("division_id")
    .order("placement");

  // Get divisions with participants
  const { data: divisions } = await supabase
    .from("divisions")
    .select(
      `
      *,
      participants:division_participants(
        *,
        athlete:athletes(*)
      )
    `
    )
    .eq("tournament_id", id);

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
