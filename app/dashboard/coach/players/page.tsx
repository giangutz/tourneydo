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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, UserPlus } from "lucide-react"
import Link from "next/link"

export default async function CoachPlayersPage() {
  const { userId } = await auth()
  if (!userId) return null

  const supabase = await createClerkSupabaseClient()
  
  // Fetch players created by this coach
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("coach_id", userId)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Players</h1>
        <Button asChild>
          <Link href="/dashboard/coach/players/new">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Player
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Players</CardTitle>
          <CardDescription>Manage your athletes and assign them to teams.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players?.map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">
                    {player.first_name} {player.last_name}
                  </TableCell>
                  <TableCell>{player.email || "-"}</TableCell>
                  <TableCell>{player.dob ? new Date(player.dob).toLocaleDateString() : "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/coach/players/${player.id}`}>
                        Manage
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {players?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No players found. Add your first player to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
