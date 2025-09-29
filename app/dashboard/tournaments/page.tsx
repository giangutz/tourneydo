import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TournamentsList } from "@/components/tournaments/tournaments-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function TournamentsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/auth/sign-in");
  }

  const supabase = await createClient();

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_id", userId)
    .single();

  if (!profile) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight">
            {profile.role === "organizer" ? "My Tournaments" : "Tournaments"}
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-2">
            {profile.role === "organizer" 
              ? "Create, manage, and monitor your tournaments" 
              : "Discover and register for upcoming taekwondo tournaments"}
          </p>
        </div>
        {profile.role === "organizer" && (
          <div className="w-full md:w-auto md:flex md:justify-end">
            <Link href="/dashboard/tournaments/create" className="w-full md:w-auto">
              <Button size="lg" className="shadow-lg w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Create Tournament
              </Button>
            </Link>
          </div>
        )}
      </div>
      
      <TournamentsList userProfile={profile} />
    </div>
  );
}
