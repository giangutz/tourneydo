import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { 
  Users, 
  Trophy, 
  Swords, 
  Settings, 
  ArrowLeft,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { routes } from '@/config/routes'
import { Badge } from '@/components/ui/badge'

interface TournamentDashboardPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function TournamentDashboardPage({ params }: TournamentDashboardPageProps) {
  const { id } = await params
  const tournament = await getTournamentById(id)

  if (!tournament) {
    notFound()
  }

  const participants = await getTournamentParticipants(id)
  const approvedParticipants = participants.filter(p => p.status === 'approved')

  return (
    <DashboardShell>
      <PageHeader
        title={tournament.name}
        description="Tournament Dashboard"
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={routes.organizer.tournaments}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to List
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/tournaments/${tournament.id}`} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                Public Page
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{tournament.status}</div>
            <p className="text-xs text-muted-foreground">Current tournament state</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{participants.length}</div>
            <p className="text-xs text-muted-foreground">
              {approvedParticipants.length} approved
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-4">Management</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:bg-muted/50 transition-colors">
          <Link href={routes.organizer.tournamentParticipants(tournament.id)}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Participants
              </CardTitle>
              <CardDescription>Manage registrations and approvals</CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:bg-muted/50 transition-colors">
          <Link href={routes.organizer.tournamentBracket(tournament.id)}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="mr-2 h-5 w-5" />
                Bracket
              </CardTitle>
              <CardDescription>Generate and view tournament bracket</CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:bg-muted/50 transition-colors">
          <Link href={routes.organizer.tournamentMatches(tournament.id)}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Swords className="mr-2 h-5 w-5" />
                Matches
              </CardTitle>
              <CardDescription>Live match console and results</CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:bg-muted/50 transition-colors">
          <Link href={routes.organizer.tournamentEdit(tournament.id)}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Settings
              </CardTitle>
              <CardDescription>Edit tournament details</CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </DashboardShell>
  )
}
