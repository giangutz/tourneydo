import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditTournamentForm } from "@/components/tournaments/edit-tournament-form";

export default async function EditTournamentPage(params: { id: string }) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/auth/sign-in");
  }

  const supabase = await createClient();

  // Get user profile to check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile || profile.role !== "organizer") {
    redirect("/dashboard");
  }

  // Get tournament details
  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !tournament) {
    redirect("/dashboard/tournaments");
  }

  // Check if user owns this tournament
  if (tournament.organizer_id !== profile.id) {
    redirect("/dashboard/tournaments");
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Tournament</h1>
        <p className="text-muted-foreground">
          Update tournament details and settings
        </p>
      </div>
      
      <EditTournamentForm tournament={tournament} />
    </div>
  );
}
