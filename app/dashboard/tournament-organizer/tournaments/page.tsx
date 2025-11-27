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
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function OrganizerTournamentsPage() {
  const { userId } = await auth()
  if (!userId) return null

  const supabase = await createClerkSupabaseClient()
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .eq("organizer_id", userId)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Tournaments</h1>
        <Button asChild>
          <Link href="/dashboard/tournament-organizer/tournaments/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Tournament
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tournaments?.map((tournament) => (
          <Card key={tournament.id}>
            <CardHeader>
              <CardTitle>{tournament.name}</CardTitle>
              <CardDescription>
                {tournament.start_date ? new Date(tournament.start_date).toLocaleDateString() : "Date TBD"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/dashboard/tournament-organizer/tournaments/${tournament.id}`}>
                  Manage
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {tournaments?.length === 0 && (
          <div className="col-span-full flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <h3 className="mt-4 text-lg font-semibold">No tournaments yet</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
              Create your first tournament to start accepting registrations.
            </p>
            <Button asChild>
              <Link href="/dashboard/tournament-organizer/tournaments/new">Create Tournament</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
