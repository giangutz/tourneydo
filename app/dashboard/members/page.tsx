import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MembersList } from "@/components/members/members-list-new";

export default async function MembersPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/auth/sign-in");
  }

  const supabase = await createClient();

  // Get user profile using clerk_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_id", userId)
    .single();

  if (!profile) {
    redirect("/auth/sign-in");
  }

  // Only organizers can access members page
  if (profile.role !== "organizer") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight">
            Members
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-2">
            Manage your team members and their tournament access
          </p>
        </div>
      </div>
      
      <MembersList organizerId={profile.id} organizerName={profile.full_name} />
    </div>
  );
}
