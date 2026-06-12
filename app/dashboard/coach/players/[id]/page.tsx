import { createServerSupabaseClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"
import { EditPlayerForm } from "./edit-player-form"
import { Tag } from "@/components/ui/tags-selector"
import { getPlayerCareerStats } from "@/lib/db/queries/player-stats"
import { PlayerStatsCard } from "@/components/players/player-stats-card"

export default async function PlayerDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { userId } = await auth()
  if (!userId) return null

  const { id } = await params
  const supabase = createServerSupabaseClient()

  const [playerRes, teamsRes, assignmentsRes, stats] = await Promise.all([
    (supabase as any).from("players").select("*").eq("id", id).eq("coach_id", userId).single(),
    (supabase as any).from("teams").select("id, name").eq("user_id", userId),
    (supabase as any).from("team_players").select("team_id, teams(name)").eq("player_id", id),
    getPlayerCareerStats(id),
  ])

  if (!playerRes.data) notFound()

  const formattedTeams: Tag[] = (teamsRes.data ?? []).map((team: any) => ({
    id: team.id,
    label: team.name,
  }))

  const currentAssignments: Tag[] = (assignmentsRes.data ?? []).map((a: any) => ({
    id: a.team_id,
    label: a.teams.name,
  }))

  return (
    <div className="space-y-6 p-6">
      <EditPlayerForm
        player={playerRes.data}
        availableTeams={formattedTeams}
        currentAssignments={currentAssignments}
      />
      <PlayerStatsCard stats={stats} label="Career Stats" />
    </div>
  )
}
