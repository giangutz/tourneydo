import { createClerkSupabaseClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Plus, Users } from "lucide-react"
import Link from "next/link"

export default async function CoachTeamsPage() {
  const { userId } = await auth()
  if (!userId) return null

  const supabase = await createClerkSupabaseClient()
  const { data: teams } = await supabase
    .from("teams")
    .select("*, team_players(count)")
    .eq("user_id", userId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Teams</h1>
        <Button asChild>
          <Link href="/dashboard/coach/teams/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Team
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams?.map((team) => (
          <Card key={team.id}>
            <CardHeader>
              <CardTitle>{team.name}</CardTitle>
              <CardDescription>Created on {new Date(team.created_at).toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{team.team_players?.[0]?.count || 0} Players</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {teams?.length === 0 && (
          <div className="col-span-full flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No teams yet</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
              Create your first team to start managing players and registrations.
            </p>
            <Button asChild>
              <Link href="/dashboard/coach/teams/new">Create Team</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
