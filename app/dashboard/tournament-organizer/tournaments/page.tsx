import { getTournaments } from '@/app/actions/tournaments'
import { TournamentDialog } from '@/components/admin/tournament-dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Edit, Plus, Eye } from 'lucide-react'
import Link from 'next/link'

export default async function AdminTournamentsPage() {
  const { data: tournaments, error } = await getTournaments()

  if (error) return <div className="p-4 text-red-500">Error: {error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tournaments</h1>
          <p className="text-muted-foreground">
            Manage your events and competitions.
          </p>
        </div>
        <TournamentDialog
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Tournament
            </Button>
          }
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tournaments?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No tournaments found. Create your first one.
                </TableCell>
              </TableRow>
            )}
            {tournaments?.map((tournament) => (
              <TableRow key={tournament.id}>
                <TableCell className="font-medium">{tournament.title}</TableCell>
                <TableCell>{new Date(tournament.date).toLocaleDateString()}</TableCell>
                <TableCell>{tournament.venue}</TableCell>
                <TableCell>
                  <Badge variant={
                    tournament.status === 'registration_open' ? 'default' : 
                    tournament.status === 'live' ? 'destructive' : 'secondary'
                  }>
                    {tournament.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/dashboard/admin/tournaments/${tournament.id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <TournamentDialog
                      tournament={tournament}
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
