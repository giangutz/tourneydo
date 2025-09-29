import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportsManager } from "@/components/reports/reports-manager";

export default async function ReportsPage() {
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

  if (!profile || profile.role !== "organizer") {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          Generate comprehensive reports for your tournaments
        </p>
      </div>
      
      <ReportsManager organizerId={profile.id} />
    </div>
  );
}
