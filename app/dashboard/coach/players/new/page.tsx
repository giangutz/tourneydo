import { createClerkSupabaseClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"
import { NewPlayerForm } from "./new-player-form"
import { Tag } from "@/components/ui/tags-selector"

export default async function NewPlayerPage() {
  const { userId } = await auth()
  if (!userId) return null

  const supabase = await createClerkSupabaseClient()
  
  // Fetch coach's teams
  const { data: teams } = await (supabase as any)
    .from("teams")
    .select("id, name")
    .eq("user_id", userId)

  const formattedTeams: Tag[] = teams?.map((team: any) => ({
    id: team.id,
    label: team.name
  })) || []

  return <NewPlayerForm availableTeams={formattedTeams} />
}
