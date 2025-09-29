import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/auth/sign-in");
  }

  const supabase = await createClient();

  // Get user profile with role using clerk_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_id", userId)
    .single();

  if (!profile) {
    // If no profile exists, redirect to complete profile setup
    redirect("/auth/complete-profile");
  }

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar profile={profile}>
        {children}
      </DashboardSidebar>
    </div>
  );
}
