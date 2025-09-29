import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateAthleteForm } from "@/components/athletes/create-athlete-form";

export default async function CreateAthletePage() {
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

  if (!profile || profile.role !== "coach") {
    redirect("/dashboard");
  }

  // Get coach's team
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("coach_id", profile.id)
    .single();

  if (!team) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Add Athlete</h1>
        <p className="text-muted-foreground">
          Add a new athlete to your team: {team.name}
        </p>
      </div>
      
      <CreateAthleteForm teamId={team.id} />
    </div>
  );
}
