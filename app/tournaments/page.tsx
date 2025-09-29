import { createClient } from "@/lib/supabase/server";
import { PublicTournamentsList } from "@/components/tournaments/public-tournaments-list";

export default async function PublicTournamentsPage() {
  const supabase = await createClient();

  // Get all published tournaments (exclude drafts)
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select(`
      *,
      organizer:profiles(full_name, organization)
    `)
    .neq("status", "draft")
    .order("tournament_date", { ascending: true });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Taekwondo Tournaments</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Discover upcoming competitions, view results from past tournaments, 
              and find the perfect event for your skill level.
            </p>
          </div>
        </div>
      </div>

      {/* Tournaments List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PublicTournamentsList tournaments={tournaments || []} />
      </div>
    </div>
  );
}
