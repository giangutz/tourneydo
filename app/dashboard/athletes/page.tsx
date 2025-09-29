import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AthletesList } from "@/components/athletes/athletes-list";

export default async function AthletesPage() {
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
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Athletes</h1>
        <p className="text-muted-foreground">
          Manage your team: {team.name}
        </p>
      </div>
      
      <AthletesList teamId={team.id} />
    </div>
  );
}
