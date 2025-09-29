import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrganizerDashboard } from "@/components/dashboard/organizer-dashboard";
import { CoachDashboard } from "@/components/dashboard/coach-dashboard";
import { AthleteDashboard } from "@/components/dashboard/athlete-dashboard";
import { ClerkUserMetadata } from "@/lib/types/clerk";

export default async function DashboardPage() {
  const { userId, sessionClaims } = await auth();
  
  if (!userId) {
    redirect("/auth/sign-in");
  }

  // Get current role from Clerk metadata (single source of truth)
  const metadata = sessionClaims?.publicMetadata as ClerkUserMetadata;
  const currentRole = metadata?.currentRole;
  
  // If no current role is set, redirect to role selection or profile completion
  if (!currentRole) {
    if (metadata?.roles && metadata.roles.length > 1) {
      redirect("/auth/select-role");
    } else if (!metadata?.onboardingComplete) {
      redirect("/auth/complete-profile");
    } else {
      // Single role user - set current role to their only role
      redirect("/auth/select-role");
    }
  }

  const supabase = await createClient();

  // Get the profile data for the current role
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_id", userId)
    .eq("role", currentRole)
    .single();

  if (!profile) {
    // Profile doesn't exist for this role - redirect to complete profile
    redirect("/auth/complete-profile");
  }

  // Render different dashboards based on CURRENT role from Clerk metadata
  switch (currentRole) {
    case "organizer":
      return <OrganizerDashboard profile={profile} />;
    case "coach":
      return <CoachDashboard profile={profile} />;
    case "athlete":
      return <AthleteDashboard profile={profile} />;
    default:
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Role Selection Required</h1>
            <p className="text-muted-foreground mb-4">
              Please select your active role to continue.
            </p>
            <a 
              href="/auth/select-role" 
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Select Role
            </a>
          </div>
        </div>
      );
  }
}
