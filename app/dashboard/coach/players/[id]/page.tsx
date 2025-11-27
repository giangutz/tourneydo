import { createClerkSupabaseClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"
import { EditPlayerForm } from "./edit-player-form"
import { Tag } from "@/components/ui/tags-selector"

export default async function PlayerDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { userId } = await auth()
  if (!userId) return null

  const { id } = await params
  const supabase = await createClerkSupabaseClient()

  // Fetch player details
  const { data: player } = await (supabase as any)
    .from("players")
    .select("*")
    .eq("id", id)
    .eq("coach_id", userId)
    .single()

  if (!player) {
    notFound()
  }

  // Fetch coach's teams
  const { data: teams } = await (supabase as any)
    .from("teams")
    .select("id, name")
    .eq("user_id", userId)

  // Fetch current team assignments
  const { data: assignments } = await (supabase as any)
    .from("team_players")
    .select("team_id, teams(name)")
    .eq("player_id", player.id)

  const formattedTeams: Tag[] = teams?.map((team: any) => ({
    id: team.id,
    label: team.name
  })) || []

  const currentAssignments: Tag[] = assignments?.map((a: any) => ({
    id: a.team_id,
    label: a.teams.name
  })) || []

  return (
    <EditPlayerForm 
      player={player} 
      availableTeams={formattedTeams} 
      currentAssignments={currentAssignments} 
    />
  )
}
